const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { emitNotification } = require('../services/notificationService');
const { reviewClaim } = require('../services/claimReviewService');
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const { getPagination, paginationResult } = require('../utils/query');
const {
  cleanupPendingUploads,
  queueAssetsForCleanup,
} = require('../services/pendingUploadService');

const idValidator = () => param('id').isUUID().withMessage('Valid record id required');

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [userRoles, itemGroups, reportGroups, claimGroups, recentUsers, recentItems] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.item.groupBy({ by: ['type', 'status'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.report.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.claim.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.item.count({ where: { deletedAt: null, createdAt: { gte: weekAgo } } }),
    ]);

    const sum = (rows, predicate = () => true) => rows
      .filter(predicate)
      .reduce((total, row) => total + row._count._all, 0);
    const totalUsers = sum(userRoles, row => row.role === 'USER');
    const totalItems = sum(itemGroups);
    const lostItems = sum(itemGroups, row => row.type === 'LOST');
    const foundItems = sum(itemGroups, row => row.type === 'FOUND');
    const returnedItems = sum(itemGroups, row => row.status === 'RETURNED');
    const activeItems = sum(itemGroups, row => row.status === 'ACTIVE');
    const totalReports = sum(reportGroups);
    const pendingReports = sum(reportGroups, row => row.status === 'PENDING');
    const totalClaims = sum(claimGroups);
    const pendingClaims = sum(claimGroups, row => row.status === 'PENDING');

    // Success rate
    const successRate = totalItems > 0 ? Math.round((returnedItems / totalItems) * 100) : 0;

    res.json({
      users: { total: totalUsers, newThisWeek: recentUsers },
      items: {
        total: totalItems, lost: lostItems, found: foundItems,
        returned: returnedItems, active: activeItems, newThisWeek: recentItems,
      },
      reports: { total: totalReports, pending: pendingReports },
      claims: { total: totalClaims, pending: pendingClaims },
      successRate,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Users ────────────────────────────────────────────────────────────────────
router.get('/users', [
  query('role').optional().isIn(['USER', 'ADMIN', 'SUPER_ADMIN']),
  query('banned').optional().isBoolean(),
  query('search').optional().trim().isLength({ max: 120 }),
  query('page').optional().isInt({ min: 1, max: 1000 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], validate, async (req, res, next) => {
  try {
    const { search, role, banned, page = 1, limit = 20 } = req.query;
    const pagination = getPagination({ page, limit }, { defaultLimit: 20, maxLimit: 100 });

    const where = {
      ...(role && { role }),
      ...(banned !== undefined && { isBanned: banned === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, role: true,
          isBanned: true, banReason: true, isVerified: true,
          avatarUrl: true, createdAt: true,
          _count: { select: { items: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, ...paginationResult(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/ban', [
  idValidator(),
  body('isBanned').isBoolean(),
  body('banReason').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('banReason').custom((value, { req }) => {
    if (req.body.isBanned && (!value || value.length < 3)) throw new Error('Ban reason must be at least 3 characters');
    return true;
  }),
], validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isBanned, banReason } = req.body;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot ban your own account' });
    if (target.role === 'SUPER_ADMIN') return res.status(403).json({ error: 'Cannot ban super admin' });
    if (target.role === 'ADMIN' && req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Super admin required' });

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { isBanned, banReason: isBanned ? banReason : null },
        select: { id: true, name: true, isBanned: true, banReason: true },
      });
      if (isBanned) {
        await tx.refreshToken.deleteMany({ where: { userId: id } });
        const quarantined = await tx.item.updateMany({
          where: {
            userId: id,
            isApproved: true,
            status: { in: ['ACTIVE', 'MATCHED', 'CLAIM_PENDING'] },
          },
          data: {
            isApproved: false,
            matchingPending: false,
            matchingLockedAt: null,
            matchingRetryAt: null,
            matchingAttempts: 0,
            matchingLastError: null,
          },
        });
        const removedMatches = await tx.match.deleteMany({
          where: {
            OR: [
              { lostItem: { userId: id } },
              { foundItem: { userId: id } },
            ],
          },
        });
        return {
          ...user,
          quarantinedItems: quarantined.count,
          removedMatches: removedMatches.count,
        };
      }
      return user;
    });
    if (isBanned) {
      try {
        const { getIO } = require('../socket');
        const io = getIO();
        io.to(`user:${id}`).emit('account:disabled', { message: 'This account has been disabled.' });
        io.in(`user:${id}`).disconnectSockets(true);
      } catch {
        // HTTP-only tests and startup windows may not have a Socket.IO server.
      }
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/role', [idValidator()], validate, async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Super admin only' });
    const { role } = req.body;
    if (!['USER', 'ADMIN'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot change your own role' });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, role: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── Items ────────────────────────────────────────────────────────────────────
router.get('/items', [
  query('type').optional().isIn(['LOST', 'FOUND']),
  query('status').optional().isIn(['ACTIVE', 'MATCHED', 'CLAIM_PENDING', 'RETURNED', 'CLOSED', 'REJECTED']),
  query('approved').optional().isBoolean(),
  query('search').optional().trim().isLength({ max: 120 }),
  query('page').optional().isInt({ min: 1, max: 1000 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], validate, async (req, res, next) => {
  try {
    const { search, type, status, approved, page = 1, limit = 20 } = req.query;
    const pagination = getPagination({ page, limit }, { defaultLimit: 20, maxLimit: 100 });

    const where = {
      deletedAt: null,
      ...(type && { type }),
      ...(status && { status }),
      ...(approved !== undefined && { isApproved: approved === 'true' }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where, skip: pagination.skip, take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { reports: true, comments: true, claims: true } },
        },
      }),
      prisma.item.count({ where }),
    ]);

    const safeItems = items.map(({ embedding, ...item }) => item);
    res.json({ items: safeItems, ...paginationResult(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
});

router.patch('/items/:id/approve', [
  idValidator(),
  body('isApproved').isBoolean(),
  body('contentRevision').isInt({ min: 1 }).withMessage('Reviewed content revision is required'),
  body('adminNote').optional({ nullable: true }).trim().isLength({ max: 500 }),
], validate, async (req, res, next) => {
  try {
    const { isApproved, adminNote, contentRevision } = req.body;
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.item.findUnique({
        where: { id: req.params.id },
        select: { status: true, contentRevision: true, deletedAt: true },
      });
      if (!existing) {
        const error = new Error('Item not found');
        error.status = 404;
        throw error;
      }
      if (existing.deletedAt) {
        const error = new Error('Deleted items cannot be approved');
        error.status = 409;
        throw error;
      }
      if (existing.contentRevision !== Number(contentRevision)) {
        const error = new Error('This report changed after it was reviewed. Reload it before moderating.');
        error.status = 409;
        throw error;
      }

      const terminalLifecycle = ['RETURNED', 'CLOSED'].includes(existing.status);
      const nextStatus = terminalLifecycle ? existing.status : (isApproved ? 'ACTIVE' : 'REJECTED');

      // Moderation and matching visibility change together. Removing old rows
      // prevents stale suggestions from surviving a rejection or re-approval.
      await tx.match.deleteMany({
        where: { OR: [{ lostItemId: req.params.id }, { foundItemId: req.params.id }] },
      });

      const approved = await tx.item.updateMany({
        where: {
          id: req.params.id,
          contentRevision: Number(contentRevision),
          status: existing.status,
          deletedAt: null,
        },
        data: {
          isApproved,
          adminNote,
          // Moderation must not reopen a completed lifecycle. isApproved alone
          // hides terminal items while they are under review.
          status: nextStatus,
          matchingPending: isApproved && !terminalLifecycle,
          matchingLockedAt: null,
          matchingRetryAt: null,
          matchingAttempts: 0,
          matchingLastError: null,
        },
      });
      if (approved.count !== 1) {
        const error = new Error('This report changed after it was reviewed. Reload it before moderating.');
        error.status = 409;
        throw error;
      }
      return tx.item.findUnique({ where: { id: req.params.id } });
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/items/:id', [idValidator()], validate, async (req, res, next) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        userId: true,
        contentRevision: true,
        deletedAt: true,
        images: { select: { url: true, publicId: true } },
      },
    });
    if (!item || item.deletedAt) return res.status(404).json({ error: 'Item not found' });

    let cleanupIds = [];
    await prisma.$transaction(async (tx) => {
      const removed = await tx.item.updateMany({
        where: { id: item.id, deletedAt: null, contentRevision: item.contentRevision },
        data: {
          deletedAt: new Date(),
          isApproved: false,
          contentRevision: { increment: 1 },
          matchingPending: false,
          matchingLockedAt: null,
          matchingRetryAt: null,
          matchingAttempts: 0,
          matchingLastError: null,
        },
      });
      if (removed.count !== 1) {
        const error = new Error('This report changed. Reload it before deleting.');
        error.status = 409;
        throw error;
      }
      cleanupIds = await queueAssetsForCleanup(tx, item.userId, item.images);
      await Promise.all([
        tx.itemImage.deleteMany({ where: { itemId: item.id } }),
        tx.chat.deleteMany({ where: { itemId: item.id } }),
        tx.match.deleteMany({ where: { OR: [{ lostItemId: item.id }, { foundItemId: item.id }] } }),
      ]);
    });
    if (cleanupIds.length) {
      void cleanupPendingUploads({ ids: cleanupIds, limit: cleanupIds.length })
        .catch(error => console.error('Failed to remove moderated item assets:', error));
    }
    res.json({ message: 'Item deleted' });
  } catch (err) {
    next(err);
  }
});

// ─── Claims ───────────────────────────────────────────────────────────────────
router.get('/claims', [
  query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']),
  query('page').optional().isInt({ min: 1, max: 1000 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], validate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pagination = getPagination({ page, limit }, { defaultLimit: 20, maxLimit: 100 });

    const where = { ...(status && { status }) };

    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where, skip: pagination.skip, take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          claimant: { select: { id: true, name: true, email: true, avatarUrl: true } },
          item: {
            select: {
              id: true, title: true, type: true, status: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
      prisma.claim.count({ where }),
    ]);

    res.json({ claims, ...paginationResult(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
});

router.patch('/claims/:id', [
  idValidator(),
  body('status').isIn(['APPROVED', 'REJECTED']),
  body('adminNote').optional({ nullable: true }).trim().isLength({ max: 500 }),
], validate, async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await reviewClaim({
      claimId: req.params.id,
      status,
      adminNote,
      reviewerId: req.user.id,
      reviewerRole: req.user.role,
      adminReview: true,
    });

    result.notifications.forEach(emitNotification);
    res.json(result.claim);
  } catch (err) {
    next(err);
  }
});

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get('/reports', [
  query('status').optional().isIn(['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED']),
  query('page').optional().isInt({ min: 1, max: 1000 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], validate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pagination = getPagination({ page, limit }, { defaultLimit: 20, maxLimit: 100 });

    const where = { ...(status && { status }) };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where, skip: pagination.skip, take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          item: { select: { id: true, title: true, type: true } },
          itemOwner: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    res.json({ reports, ...paginationResult(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
});

router.patch('/reports/:id', [
  idValidator(),
  body('status').isIn(['REVIEWED', 'RESOLVED', 'DISMISSED']),
  body('adminNote').optional({ nullable: true }).trim().isLength({ max: 500 }),
], validate, async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    const isTerminal = ['RESOLVED', 'DISMISSED'].includes(status);
    const updated = await prisma.report.update({
      where: { id: req.params.id },
      data: {
        status,
        adminNote,
        resolvedAt: isTerminal ? new Date() : null,
        resolvedBy: isTerminal ? req.user.id : null,
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Contact inbox
router.get('/contacts', [
  query('status').optional().isIn(['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM']),
  query('page').optional().isInt({ min: 1, max: 1000 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 120 }),
], validate, async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const pagination = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const [contacts, total] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contactMessage.count({ where }),
    ]);
    res.json({ contacts, ...paginationResult(total, pagination.page, pagination.limit) });
  } catch (error) {
    next(error);
  }
});

router.patch('/contacts/:id', [
  idValidator(),
  body('status').isIn(['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM']),
  body('adminNote').optional({ nullable: true }).trim().isLength({ max: 1000 }),
], validate, async (req, res, next) => {
  try {
    const contact = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: {
        status: req.body.status,
        ...(req.body.adminNote !== undefined && { adminNote: req.body.adminNote || null }),
        resolvedAt: req.body.status === 'RESOLVED' ? new Date() : null,
      },
    });
    res.json(contact);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Contact message not found' });
    next(error);
  }
});

module.exports = router;

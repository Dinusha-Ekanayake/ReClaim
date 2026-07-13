const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { createNotification } = require('../services/notificationService');
const { body, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const { getPagination, paginationResult } = require('../utils/query');

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [userRoles, itemGroups, reportGroups, claimGroups, recentUsers, recentItems] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.item.groupBy({ by: ['type', 'status'], _count: { _all: true } }),
      prisma.report.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.claim.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.item.count({ where: { createdAt: { gte: weekAgo } } }),
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
  query('page').optional().isInt({ min: 1 }),
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

    const updated = await prisma.user.update({
      where: { id },
      data: { isBanned, banReason: isBanned ? banReason : null },
      select: { id: true, name: true, isBanned: true, banReason: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/role', async (req, res, next) => {
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
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], validate, async (req, res, next) => {
  try {
    const { search, type, status, approved, page = 1, limit = 20 } = req.query;
    const pagination = getPagination({ page, limit }, { defaultLimit: 20, maxLimit: 100 });

    const where = {
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
  body('isApproved').isBoolean(),
  body('adminNote').optional({ nullable: true }).trim().isLength({ max: 500 }),
], validate, async (req, res, next) => {
  try {
    const { isApproved, adminNote } = req.body;
    const updated = await prisma.item.update({
      where: { id: req.params.id },
      data: {
        isApproved,
        adminNote,
        status: isApproved ? 'ACTIVE' : 'REJECTED',
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/items/:id', async (req, res, next) => {
  try {
    const item = await prisma.item.findUnique({ where: { id: req.params.id }, select: { images: { select: { publicId: true } } } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await prisma.item.delete({ where: { id: req.params.id } });
    const { deleteFromCloudinary } = require('../services/cloudinaryService');
    await Promise.all(item.images.filter((image) => image.publicId).map((image) => deleteFromCloudinary(image.publicId)));
    res.json({ message: 'Item deleted' });
  } catch (err) {
    next(err);
  }
});

// ─── Claims ───────────────────────────────────────────────────────────────────
router.get('/claims', [
  query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']),
  query('page').optional().isInt({ min: 1 }),
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
  body('status').isIn(['APPROVED', 'REJECTED']),
  body('adminNote').optional({ nullable: true }).trim().isLength({ max: 500 }),
], validate, async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const claim = await prisma.claim.findUnique({
      where: { id: req.params.id },
      include: { item: { select: { id: true, title: true } } },
    });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.status !== 'PENDING') return res.status(409).json({ error: 'Claim has already been reviewed' });
    const displacedClaims = status === 'APPROVED'
      ? await prisma.claim.findMany({
          where: { itemId: claim.itemId, id: { not: req.params.id }, status: 'PENDING' },
          select: { claimantId: true },
        })
      : [];

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.claim.updateMany({
        where: { id: req.params.id, status: 'PENDING' },
        data: { status, adminNote, reviewedAt: new Date(), reviewedBy: req.user.id },
      });
      if (result.count !== 1) {
        const error = new Error('Claim has already been reviewed');
        error.status = 409;
        throw error;
      }
      if (status === 'APPROVED') {
        await tx.claim.updateMany({
          where: { itemId: claim.itemId, id: { not: req.params.id }, status: 'PENDING' },
          data: { status: 'REJECTED', adminNote: 'Another claim was approved', reviewedAt: new Date(), reviewedBy: req.user.id },
        });
        await tx.item.update({ where: { id: claim.itemId }, data: { status: 'RETURNED' } });
      } else {
        const pending = await tx.claim.count({ where: { itemId: claim.itemId, status: 'PENDING' } });
        await tx.item.update({ where: { id: claim.itemId }, data: { status: pending > 0 ? 'CLAIM_PENDING' : 'ACTIVE' } });
      }
      return tx.claim.findUnique({
        where: { id: req.params.id }, select: { id: true, status: true, adminNote: true },
      });
    });

    if (status === 'APPROVED') {
      await createNotification(
        claim.claimantId, 'CLAIM_APPROVED',
        'Your claim was approved!',
        `Your claim for "${claim.item.title}" has been approved by an admin.`,
        `/items/${claim.itemId}`
      );
      await Promise.all(displacedClaims.map((other) => createNotification(
        other.claimantId, 'CLAIM_REJECTED', 'Claim not approved',
        `Another claim for "${claim.item.title}" was approved.`, `/items/${claim.itemId}`
      )));
    } else {
      await createNotification(
        claim.claimantId, 'CLAIM_REJECTED',
        'Claim not approved',
        `Your claim for "${claim.item.title}" was not approved.`,
        `/items/${claim.itemId}`
      );
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get('/reports', [
  query('status').optional().isIn(['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED']),
  query('page').optional().isInt({ min: 1 }),
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
  body('status').isIn(['REVIEWED', 'RESOLVED', 'DISMISSED']),
  body('adminNote').optional({ nullable: true }).trim().isLength({ max: 500 }),
], validate, async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    const updated = await prisma.report.update({
      where: { id: req.params.id },
      data: { status, adminNote, resolvedAt: new Date(), resolvedBy: req.user.id },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Contact inbox
router.get('/contacts', [
  query('status').optional().isIn(['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM']),
  query('page').optional().isInt({ min: 1 }),
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

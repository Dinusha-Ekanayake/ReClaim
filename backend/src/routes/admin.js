const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalUsers, totalItems, lostItems, foundItems,
      returnedItems, activeItems, totalReports, pendingReports,
      totalClaims, pendingClaims, recentUsers, recentItems,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.item.count(),
      prisma.item.count({ where: { type: 'LOST' } }),
      prisma.item.count({ where: { type: 'FOUND' } }),
      prisma.item.count({ where: { status: 'RETURNED' } }),
      prisma.item.count({ where: { status: 'ACTIVE' } }),
      prisma.report.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.claim.count(),
      prisma.claim.count({ where: { status: 'PENDING' } }),
      // Users last 7 days
      prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      // Items last 7 days
      prisma.item.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

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
router.get('/users', async (req, res, next) => {
  try {
    const { search, role, banned, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

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
        skip,
        take: Number(limit),
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

    res.json({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/ban', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isBanned, banReason } = req.body;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'SUPER_ADMIN') return res.status(403).json({ error: 'Cannot ban super admin' });

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
router.get('/items', async (req, res, next) => {
  try {
    const { search, type, status, approved, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

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
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { reports: true, comments: true, claims: true } },
        },
      }),
      prisma.item.count({ where }),
    ]);

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
});

router.patch('/items/:id/approve', async (req, res, next) => {
  try {
    const { isApproved, adminNote } = req.body;
    const updated = await prisma.item.update({
      where: { id: req.params.id },
      data: {
        isApproved,
        adminNote,
        ...(isApproved === false && { status: 'REJECTED' }),
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/items/:id', async (req, res, next) => {
  try {
    await prisma.item.delete({ where: { id: req.params.id } });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    next(err);
  }
});

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get('/reports', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { ...(status && { status }) };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          item: { select: { id: true, title: true, type: true } },
          itemOwner: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    res.json({ reports, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
});

router.patch('/reports/:id', async (req, res, next) => {
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

module.exports = router;

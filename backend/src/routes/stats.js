const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// GET /api/stats — public community stats (no moderation data exposed)
// Used by the public home and impact pages. Safe to call without auth.
router.get('/', async (req, res, next) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const publicItemWhere = { isApproved: true, status: { not: 'REJECTED' } };
    const [
      totalUsers, itemTypes, itemStatuses, recentUsers, recentItems,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.item.groupBy({ by: ['type'], where: publicItemWhere, _count: { _all: true } }),
      prisma.item.groupBy({ by: ['status'], where: publicItemWhere, _count: { _all: true } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.item.count({ where: { ...publicItemWhere, createdAt: { gte: weekAgo } } }),
    ]);

    const countBy = (rows, field, value) => rows.find((row) => row[field] === value)?._count._all || 0;
    const lostItems = countBy(itemTypes, 'type', 'LOST');
    const foundItems = countBy(itemTypes, 'type', 'FOUND');
    const totalItems = lostItems + foundItems;
    const returnedItems = countBy(itemStatuses, 'status', 'RETURNED');
    const activeItems = countBy(itemStatuses, 'status', 'ACTIVE');

    const successRate = totalItems > 0 ? Math.round((returnedItems / totalItems) * 100) : 0;

    res.json({
      users: { total: totalUsers, newThisWeek: recentUsers },
      items: {
        total: totalItems, lost: lostItems, found: foundItems,
        returned: returnedItems, active: activeItems, newThisWeek: recentItems,
      },
      successRate,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

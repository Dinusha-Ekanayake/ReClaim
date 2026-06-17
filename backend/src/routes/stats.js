const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// GET /api/stats — public community stats (no moderation data exposed)
// Used by the public home and impact pages. Safe to call without auth.
router.get('/', async (req, res, next) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, totalItems, lostItems, foundItems,
      returnedItems, activeItems, recentUsers, recentItems,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.item.count(),
      prisma.item.count({ where: { type: 'LOST' } }),
      prisma.item.count({ where: { type: 'FOUND' } }),
      prisma.item.count({ where: { status: 'RETURNED' } }),
      prisma.item.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.item.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);

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

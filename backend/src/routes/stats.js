const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

const CACHE_TTL_MS = 30_000;
let cachedStats = null;
let cacheExpiresAt = 0;
let pendingStats = null;

async function computeStats() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const publicItemWhere = {
    isApproved: true,
    deletedAt: null,
    status: { not: 'REJECTED' },
    user: { isBanned: false },
  };
  const [
    totalUsers, itemTypes, itemStatuses, recentUsers, recentItems,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'USER', isBanned: false } }),
    prisma.item.groupBy({ by: ['type'], where: publicItemWhere, _count: { _all: true } }),
    prisma.item.groupBy({ by: ['status'], where: publicItemWhere, _count: { _all: true } }),
    prisma.user.count({ where: { role: 'USER', isBanned: false, createdAt: { gte: weekAgo } } }),
    prisma.item.count({ where: { ...publicItemWhere, createdAt: { gte: weekAgo } } }),
  ]);

  const countBy = (rows, field, value) => rows.find((row) => row[field] === value)?._count._all || 0;
  const lostItems = countBy(itemTypes, 'type', 'LOST');
  const foundItems = countBy(itemTypes, 'type', 'FOUND');
  const totalItems = lostItems + foundItems;
  const returnedItems = countBy(itemStatuses, 'status', 'RETURNED');
  const activeItems = countBy(itemStatuses, 'status', 'ACTIVE');
  const successRate = totalItems > 0 ? Math.round((returnedItems / totalItems) * 100) : 0;

  return {
    users: { total: totalUsers, newThisWeek: recentUsers },
    items: {
      total: totalItems, lost: lostItems, found: foundItems,
      returned: returnedItems, active: activeItems, newThisWeek: recentItems,
    },
    successRate,
  };
}

// GET /api/stats — public community stats (no moderation data exposed)
// Used by the public home and impact pages. Safe to call without auth.
router.get('/', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=45');
    if (cachedStats && Date.now() < cacheExpiresAt) return res.json(cachedStats);

    if (!pendingStats) {
      pendingStats = computeStats()
        .then((stats) => {
          cachedStats = stats;
          cacheExpiresAt = Date.now() + CACHE_TTL_MS;
          return stats;
        })
        .finally(() => { pendingStats = null; });
    }

    return res.json(await pendingStats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

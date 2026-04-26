const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getMatchesForItem, computeMatches } = require('../services/matchingService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/matches/:itemId — get matches for an item
router.get('/:itemId', authenticate, async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Only owner or admin can see matches
    if (item.userId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const matches = await getMatchesForItem(itemId);
    res.json(matches);
  } catch (err) {
    next(err);
  }
});

// POST /api/matches/:itemId/refresh — recompute matches
router.post('/:itemId/refresh', authenticate, async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.userId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const matches = await computeMatches(itemId);
    res.json({ message: 'Matches refreshed', count: matches?.length || 0 });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

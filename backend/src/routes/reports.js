const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const VALID_REASONS = ['FAKE', 'INAPPROPRIATE', 'SPAM', 'WRONG_CATEGORY', 'OTHER'];

// POST /api/reports
router.post('/',
  authenticate,
  [
    body('itemId').notEmpty(),
    body('reason').isIn(VALID_REASONS),
    body('description').optional().isLength({ max: 500 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { itemId, reason, description } = req.body;

      const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true, userId: true } });
      if (!item) return res.status(404).json({ error: 'Item not found' });
      if (item.userId === req.user.id) return res.status(400).json({ error: 'Cannot report your own item' });

      const existing = await prisma.report.findFirst({
        where: { itemId, reporterId: req.user.id },
      });
      if (existing) return res.status(409).json({ error: 'Already reported this item' });

      const report = await prisma.report.create({
        data: {
          itemId,
          reporterId: req.user.id,
          itemOwnerId: item.userId,
          reason,
          description,
        },
      });

      res.status(201).json({ message: 'Report submitted', report });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

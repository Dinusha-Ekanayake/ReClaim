const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/comments/:itemId
router.get('/:itemId', async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const comments = await prisma.comment.findMany({
      where: { itemId, parentId: null, isHidden: false },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        replies: {
          where: { isHidden: false },
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(comments);
  } catch (err) {
    next(err);
  }
});

// POST /api/comments/:itemId
router.post('/:itemId',
  authenticate,
  [body('content').trim().isLength({ min: 1, max: 500 })],
  validate,
  async (req, res, next) => {
    try {
      const { itemId } = req.params;
      const { content, parentId } = req.body;

      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item) return res.status(404).json({ error: 'Item not found' });

      const comment = await prisma.comment.create({
        data: { itemId, userId: req.user.id, content, parentId: parentId || null },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      });

      // Notify item owner (unless commenter is owner)
      if (item.userId !== req.user.id) {
        const { createNotification } = require('../services/notificationService');
        await createNotification(
          item.userId, 'COMMENT_ADDED',
          'New comment on your item',
          `${req.user.name}: ${content.slice(0, 60)}`,
          `/items/${itemId}`
        );
      }

      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/comments/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.userId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

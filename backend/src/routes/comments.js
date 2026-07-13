const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const prisma = require('../lib/prisma');
const { emitNotification } = require('../services/notificationService');

// GET /api/comments/:itemId
router.get('/:itemId', [
  param('itemId').isUUID().withMessage('Valid item id required'),
], validate, async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const item = await prisma.item.findFirst({ where: { id: itemId, isApproved: true, deletedAt: null, status: { not: 'REJECTED' }, user: { isBanned: false } }, select: { id: true } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const comments = await prisma.comment.findMany({
      // Keep a small tombstone when a deleted parent still has visible replies;
      // otherwise those replies become unreachable from the public thread.
      where: {
        itemId,
        parentId: null,
        OR: [
          { isHidden: false },
          { replies: { some: { isHidden: false } } },
        ],
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        replies: {
          where: { isHidden: false },
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(comments.map((comment) => (
      comment.isHidden
        ? { ...comment, content: 'Comment deleted', user: null }
        : comment
    )));
  } catch (err) {
    next(err);
  }
});

// POST /api/comments/:itemId
router.post('/:itemId',
  authenticate,
  [
    param('itemId').isUUID().withMessage('Valid item id required'),
    body('content').trim().isLength({ min: 1, max: 500 }),
    body('parentId').optional({ nullable: true }).isUUID().withMessage('Valid parent comment id required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { itemId } = req.params;
      const { content, parentId } = req.body;

      const item = await prisma.item.findFirst({ where: { id: itemId, isApproved: true, deletedAt: null, status: { not: 'REJECTED' }, user: { isBanned: false } } });
      if (!item) return res.status(404).json({ error: 'Item not found' });
      if (parentId) {
        const parent = await prisma.comment.findFirst({ where: { id: parentId, itemId, parentId: null, isHidden: false }, select: { id: true } });
        if (!parent) return res.status(400).json({ error: 'Invalid parent comment' });
      }

      let notification = null;
      const comment = await prisma.$transaction(async (tx) => {
        const created = await tx.comment.create({
          data: { itemId, userId: req.user.id, content, parentId: parentId || null },
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        });
        if (item.userId !== req.user.id) {
          notification = await tx.notification.create({
            data: {
              userId: item.userId,
              type: 'COMMENT_ADDED',
              title: 'New comment on your item',
              body: `${req.user.name}: ${content.slice(0, 60)}`,
              link: `/items/${itemId}`,
            },
          });
        }
        return created;
      });

      if (notification) emitNotification(notification);

      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/comments/:id
router.delete('/:id', authenticate, [
  param('id').isUUID().withMessage('Valid comment id required'),
], validate, async (req, res, next) => {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { replies: true } } },
    });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.userId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (comment._count.replies > 0) {
      await prisma.comment.update({ where: { id: req.params.id }, data: { isHidden: true, content: '[deleted]' } });
    } else {
      await prisma.comment.delete({ where: { id: req.params.id } });
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

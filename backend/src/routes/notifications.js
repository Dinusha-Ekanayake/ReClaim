const express = require('express');
const router = express.Router();
const { param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const prisma = require('../lib/prisma');
const { getPagination, paginationResult } = require('../utils/query');

// GET /api/notifications
router.get('/', authenticate, [
  query('unread').optional().isBoolean(),
  query('page').optional().isInt({ min: 1, max: 1000 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], validate, async (req, res, next) => {
  try {
    const { unread } = req.query;
    const pagination = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });

    const where = {
      userId: req.user.id,
      ...(unread === 'true' ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
    ]);

    res.json({ notifications, unreadCount, ...paginationResult(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, [
  param('id').isUUID().withMessage('Valid notification id required'),
], validate, async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { isRead: true },
    });
    if (!result.count) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

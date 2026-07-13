const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { getPagination, paginationResult } = require('../utils/query');

// GET /api/chats — get all chats for current user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const chats = await prisma.chat.findMany({
      where: {
        participants: { some: { userId: req.user.id } },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true } } },
        },
        _count: {
          select: {
            messages: {
              where: { isRead: false, senderId: { not: req.user.id } },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    res.json(chats);
  } catch (err) {
    next(err);
  }
});

// GET /api/chats/:id — get chat with messages
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pagination = getPagination(req.query, { defaultLimit: 30, maxLimit: 100 });

    const participant = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId: id, userId: req.user.id } },
    });
    if (!participant) return res.status(404).json({ error: 'Chat not found' });

    const [chat, messages, total] = await Promise.all([
      prisma.chat.findUnique({
        where: { id },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          },
        },
      }),
      prisma.message.findMany({
        where: { chatId: id },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      prisma.message.count({ where: { chatId: id } }),
    ]);

    res.json({
      chat,
      messages: messages.reverse(),
      pagination: paginationResult(total, pagination.page, pagination.limit),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/chats — create or get existing chat with a user about an item
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { recipientId, itemId } = req.body;
    if (typeof recipientId !== 'string' || !recipientId || recipientId.length > 64) {
      return res.status(400).json({ error: 'Valid recipientId required' });
    }
    if (itemId !== undefined && (typeof itemId !== 'string' || !itemId || itemId.length > 64)) {
      return res.status(400).json({ error: 'Invalid itemId' });
    }
    if (recipientId === req.user.id) return res.status(400).json({ error: 'Cannot chat with yourself' });

    const [recipient, item] = await Promise.all([
      prisma.user.findUnique({ where: { id: recipientId }, select: { id: true, isBanned: true } }),
      itemId ? prisma.item.findUnique({ where: { id: itemId }, select: { id: true, userId: true, isApproved: true, status: true } }) : null,
    ]);
    if (!recipient || recipient.isBanned) return res.status(404).json({ error: 'Recipient not found' });
    if (itemId && (!item || !item.isApproved || item.status === 'REJECTED')) return res.status(404).json({ error: 'Item not found' });
    if (item && item.userId !== recipientId) return res.status(400).json({ error: 'Recipient is not the item owner' });

    const userIds = [req.user.id, recipientId].sort();
    const lockKey = `chat:${userIds.join(':')}:${itemId || 'direct'}`;
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      const existing = await tx.chat.findFirst({
        where: {
          AND: [
            { participants: { some: { userId: req.user.id } } },
            { participants: { some: { userId: recipientId } } },
            { itemId: itemId || null },
          ],
        },
        include: { participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } },
      });
      if (existing) return { chat: existing, created: false };
      const chat = await tx.chat.create({
        data: {
          itemId: itemId || null,
          participants: { create: [{ userId: req.user.id }, { userId: recipientId }] },
        },
        include: { participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } },
      });
      return { chat, created: true };
    });

    res.status(result.created ? 201 : 200).json(result.chat);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

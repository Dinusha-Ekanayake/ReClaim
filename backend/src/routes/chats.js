const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
    const { page = 1, limit = 30 } = req.query;

    const participant = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId: id, userId: req.user.id } },
    });
    if (!participant) return res.status(403).json({ error: 'Not a participant' });

    const skip = (Number(page) - 1) * Number(limit);
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
        skip,
        take: Number(limit),
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      prisma.message.count({ where: { chatId: id } }),
    ]);

    // Mark messages as read
    await prisma.message.updateMany({
      where: { chatId: id, senderId: { not: req.user.id }, isRead: false },
      data: { isRead: true },
    });
    await prisma.chatParticipant.update({
      where: { chatId_userId: { chatId: id, userId: req.user.id } },
      data: { lastReadAt: new Date() },
    });

    res.json({
      chat,
      messages: messages.reverse(),
      pagination: {
        total, page: Number(page), limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/chats — create or get existing chat with a user about an item
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { recipientId, itemId } = req.body;
    if (!recipientId) return res.status(400).json({ error: 'recipientId required' });
    if (recipientId === req.user.id) return res.status(400).json({ error: 'Cannot chat with yourself' });

    // Check if chat already exists between these two users
    const existing = await prisma.chat.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: req.user.id } } },
          { participants: { some: { userId: recipientId } } },
          ...(itemId ? [{ itemId }] : []),
        ],
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });

    if (existing) return res.json(existing);

    // Create new chat
    const chat = await prisma.chat.create({
      data: {
        itemId: itemId || null,
        participants: {
          create: [
            { userId: req.user.id },
            { userId: recipientId },
          ],
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });

    res.status(201).json(chat);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

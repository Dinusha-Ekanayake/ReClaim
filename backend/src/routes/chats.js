const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const prisma = require('../lib/prisma');
const { getPagination, paginationResult } = require('../utils/query');
const { primaryImageSelect } = require('../utils/selects');

const chatItemSelect = {
  id: true,
  title: true,
  type: true,
  status: true,
  category: true,
  images: primaryImageSelect,
};

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

    const itemIds = [...new Set(chats.map((chat) => chat.itemId).filter(Boolean))];
    const items = itemIds.length
      ? await prisma.item.findMany({ where: { id: { in: itemIds } }, select: chatItemSelect })
      : [];
    const itemById = new Map(items.map((item) => [item.id, item]));

    res.json(chats.map((chat) => ({
      ...chat,
      item: chat.itemId ? itemById.get(chat.itemId) || null : null,
    })));
  } catch (err) {
    next(err);
  }
});

// GET /api/chats/:id — get chat with messages
router.get('/:id', authenticate, [
  param('id').isUUID().withMessage('Valid chat id required'),
  query('cursor').optional().isUUID().withMessage('Valid message cursor required'),
  query('page').optional().isInt({ min: 1, max: 1000 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pagination = getPagination(req.query, { defaultLimit: 30, maxLimit: 100 });
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
    if (cursor && cursor.length > 64) return res.status(400).json({ error: 'Invalid message cursor' });

    const chat = await prisma.chat.findFirst({
      where: {
        id,
        participants: { some: { userId: req.user.id } },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });

    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    let cursorMessage = null;
    if (cursor) {
      cursorMessage = await prisma.message.findFirst({
        where: { id: cursor, chatId: id },
        select: { id: true, createdAt: true },
      });
      if (!cursorMessage) return res.status(400).json({ error: 'Invalid message cursor' });
    }

    // Loading older history is read-only; avoid two redundant writes for every
    // cursor page while still reconciling unread state on initial open.
    if (!cursor && pagination.page === 1) {
      const readAt = new Date();
      await prisma.$transaction([
        prisma.chatParticipant.update({
          where: { chatId_userId: { chatId: id, userId: req.user.id } },
          data: { lastReadAt: readAt },
        }),
        prisma.message.updateMany({
          where: { chatId: id, senderId: { not: req.user.id }, isRead: false },
          data: { isRead: true },
        }),
      ]);
    }

    const messageInclude = {
      sender: { select: { id: true, name: true, avatarUrl: true } },
    };
    const itemPromise = chat.itemId
      ? prisma.item.findUnique({ where: { id: chat.itemId }, select: chatItemSelect })
      : Promise.resolve(null);
    let messages;
    let paginationMeta;

    if (cursor) {
      const page = await prisma.message.findMany({
        where: {
          chatId: id,
          OR: [
            { createdAt: { lt: cursorMessage.createdAt } },
            { createdAt: cursorMessage.createdAt, id: { lt: cursorMessage.id } },
          ],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pagination.limit + 1,
        include: messageInclude,
      });
      const hasNext = page.length > pagination.limit;
      messages = hasNext ? page.slice(0, pagination.limit) : page;
      paginationMeta = {
        limit: pagination.limit,
        hasNext,
        hasPrev: true,
        nextCursor: hasNext && messages.length ? messages[messages.length - 1].id : null,
      };
    } else {
      const [page, total] = await Promise.all([
        prisma.message.findMany({
          where: { chatId: id },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: pagination.skip,
          take: pagination.limit,
          include: messageInclude,
        }),
        prisma.message.count({ where: { chatId: id } }),
      ]);
      messages = page;
      const result = paginationResult(total, pagination.page, pagination.limit);
      paginationMeta = {
        ...result,
        nextCursor: result.hasNext && messages.length ? messages[messages.length - 1].id : null,
      };
    }

    const item = await itemPromise;

    res.json({
      chat: { ...chat, item },
      messages: messages.reverse(),
      pagination: paginationMeta,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/chats — create or get existing chat with a user about an item
router.post('/', authenticate, [
  body('recipientId').isUUID().withMessage('Valid recipient id required'),
  body('itemId').isUUID().withMessage('Valid item id required'),
], validate, async (req, res, next) => {
  try {
    const { recipientId, itemId } = req.body;
    if (typeof recipientId !== 'string' || !recipientId || recipientId.length > 64) {
      return res.status(400).json({ error: 'Valid recipientId required' });
    }
    if (recipientId === req.user.id) return res.status(400).json({ error: 'Cannot chat with yourself' });

    const [recipient, item] = await Promise.all([
      prisma.user.findUnique({ where: { id: recipientId }, select: { id: true, isBanned: true } }),
      prisma.item.findFirst({
        where: { id: itemId, deletedAt: null, user: { isBanned: false } },
        select: { id: true, type: true, userId: true, isApproved: true, status: true },
      }),
    ]);
    if (!recipient || recipient.isBanned) return res.status(404).json({ error: 'Recipient not found' });
    if (!item || !item.isApproved || item.status === 'REJECTED') return res.status(404).json({ error: 'Item not found' });

    if (item.userId === recipientId && item.type === 'FOUND') {
      const claimRelationship = await prisma.claim.findUnique({
        where: { itemId_claimantId: { itemId, claimantId: req.user.id } },
        select: { id: true },
      });
      if (!claimRelationship) {
        return res.status(403).json({ error: 'Submit an ownership claim before messaging the finder' });
      }
    } else if (item.userId !== recipientId) {
      if (item.userId !== req.user.id) {
        return res.status(400).json({ error: 'A conversation must include the item owner' });
      }
      const claimRelationship = await prisma.claim.findUnique({
        where: { itemId_claimantId: { itemId, claimantId: recipientId } },
        select: { id: true },
      });
      if (!claimRelationship) {
        return res.status(403).json({ error: 'You can message only people who claimed this item' });
      }
    }

    const userIds = [req.user.id, recipientId].sort();
    const lockKey = `chat:${userIds.join(':')}:${itemId}`;
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      const availableItem = await tx.item.findFirst({
        where: {
          id: itemId,
          isApproved: true,
          deletedAt: null,
          status: { not: 'REJECTED' },
          user: { isBanned: false },
        },
        select: { id: true },
      });
      if (!availableItem) {
        const error = new Error('Item not found');
        error.status = 404;
        throw error;
      }
      const existing = await tx.chat.findFirst({
        where: {
          AND: [
            { participants: { some: { userId: req.user.id } } },
            { participants: { some: { userId: recipientId } } },
            { itemId },
          ],
        },
        include: { participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } },
      });
      if (existing) return { chat: existing, created: false };
      const chat = await tx.chat.create({
        data: {
          itemId,
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

const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { upload, uploadAvatar, deleteFromCloudinary } = require('../services/cloudinaryService');
const { validate } = require('../middleware/validate');
const prisma = require('../lib/prisma');
const { getPagination, paginationResult } = require('../utils/query');
const { publicItemSelect, publicUserSelect, primaryImageSelect } = require('../utils/selects');
const bcrypt = require('bcryptjs');
const authController = require('../controllers/authController');

const ITEM_TYPES = ['LOST', 'FOUND'];
const ITEM_STATUSES = ['ACTIVE', 'MATCHED', 'CLAIM_PENDING', 'RETURNED', 'CLOSED'];

function itemListSelect() {
  return {
    ...publicItemSelect,
    images: primaryImageSelect,
    user: { select: publicUserSelect },
    _count: { select: { comments: { where: { isHidden: false } } } },
  };
}

// PATCH /api/users/me — update profile (must be before /:id to avoid Express matching "me" as an ID)
router.patch('/me', authenticate, [
  body('name').optional().trim().isLength({ min: 2, max: 50 }),
  body('bio').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('location').optional({ nullable: true }).trim().isLength({ max: 160 }),
  body('phone').optional({ nullable: true, checkFalsy: true }).trim().matches(/^\+?[0-9 ()-]{7,20}$/).withMessage('Invalid phone number'),
  body('showPhone').optional().isBoolean(),
], validate, async (req, res, next) => {
  try {
    const { name, bio, location, phone, showPhone } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(phone !== undefined && { phone }),
        ...(showPhone !== undefined && { showPhone }),
      },
      select: {
        id: true, name: true, email: true, avatarUrl: true,
        bio: true, location: true, phone: true, showPhone: true, role: true,
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/users/me/avatar
router.post('/me/avatar', authenticate, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    const previous = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatarPublicId: true },
    });
    const { url, publicId } = await uploadAvatar(req.file.buffer);
    let updated;
    try {
      updated = await prisma.user.update({
        where: { id: req.user.id },
        data: { avatarUrl: url, avatarPublicId: publicId },
        select: { id: true, avatarUrl: true },
      });
    } catch (error) {
      await deleteFromCloudinary(publicId);
      throw error;
    }
    if (previous?.avatarPublicId && previous.avatarPublicId !== publicId) {
      deleteFromCloudinary(previous.avatarPublicId);
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/me — permanently delete a regular user's account.
router.delete('/me', authenticate, [
  body('password').isString().isLength({ min: 1, max: 128 }),
  body('confirmation').equals('DELETE'),
], validate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, password: true, role: true, avatarPublicId: true,
        items: { select: { images: { select: { publicId: true } } } },
        chatParticipants: { select: { chatId: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'USER') return res.status(403).json({ error: 'Administrator accounts must be transferred or removed by another administrator' });

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Password is incorrect' });

    // User-owned records cascade. Shared chats remain available to their other
    // participants; only now-empty chat containers are removed.
    await prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id: user.id } });
      const chatIds = user.chatParticipants.map(participant => participant.chatId);
      if (chatIds.length) {
        await tx.chat.deleteMany({
          where: { id: { in: chatIds }, participants: { none: {} } },
        });
      }
    });
    const assets = [
      ...(user.avatarPublicId ? [user.avatarPublicId] : []),
      ...user.items.flatMap(item => item.images.map(image => image.publicId)),
    ];
    await Promise.allSettled(assets.map(publicId => deleteFromCloudinary(publicId)));
    authController.clearAuthCookies(res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// GET /api/users/me/items — private owner view, including non-public statuses.
router.get('/me/dashboard', authenticate, async (req, res, next) => {
  try {
    const [itemStatuses, claims, items] = await Promise.all([
      prisma.item.groupBy({ by: ['status'], where: { userId: req.user.id }, _count: { _all: true } }),
      prisma.claim.count({ where: { claimantId: req.user.id } }),
      prisma.item.findMany({
        where: { userId: req.user.id },
        take: 4,
        orderBy: { createdAt: 'desc' },
        select: itemListSelect(),
      }),
    ]);
    const statusCount = (status) => itemStatuses.find(row => row.status === status)?._count._all || 0;
    res.json({
      items,
      stats: {
        total: itemStatuses.reduce((total, row) => total + row._count._all, 0),
        active: statusCount('ACTIVE') + statusCount('MATCHED') + statusCount('CLAIM_PENDING'),
        returned: statusCount('RETURNED'),
        claims,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me/items', authenticate, [
  query('type').optional().isIn(ITEM_TYPES),
  query('status').optional().isIn([...ITEM_STATUSES, 'REJECTED']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
], validate, async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const pagination = getPagination(req.query, { defaultLimit: 12, maxLimit: 50 });
    const where = {
      userId: req.user.id,
      ...(type && { type }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        select: itemListSelect(),
      }),
      prisma.item.count({ where }),
    ]);

    res.json({ items, ...paginationResult(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id/items (must come before /:id so Express doesn't mistake "items" for an id)
router.get('/:id/items', [
  query('type').optional().isIn(ITEM_TYPES),
  query('status').optional().isIn(ITEM_STATUSES),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
], validate, async (req, res, next) => {
  try {
    const { type, status = 'ACTIVE', page = 1, limit = 12 } = req.query;
    const pagination = getPagination({ page, limit }, { defaultLimit: 12, maxLimit: 50 });

    const where = {
      userId: req.params.id,
      isApproved: true,
      ...(type && { type }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        select: itemListSelect(),
      }),
      prisma.item.count({ where }),
    ]);

    res.json({ items, ...paginationResult(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id — public profile (must be last; matches any string as id)
router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, avatarUrl: true, bio: true,
        location: true, createdAt: true,
        _count: { select: { items: { where: { isApproved: true, status: { not: 'REJECTED' } } } } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

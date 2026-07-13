const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { upload, uploadAvatar, deleteFromCloudinary } = require('../services/cloudinaryService');
const { validate } = require('../middleware/validate');
const prisma = require('../lib/prisma');
const { getPagination, paginationResult } = require('../utils/query');
const {
  publicItemSelect,
  ownerItemSelect,
  publicUserSelect,
  primaryImageSelect,
  withPublicLocation,
} = require('../utils/selects');
const bcrypt = require('bcryptjs');
const authController = require('../controllers/authController');

const ITEM_TYPES = ['LOST', 'FOUND'];
const ITEM_STATUSES = ['ACTIVE', 'MATCHED', 'CLAIM_PENDING', 'RETURNED', 'CLOSED'];

function itemListSelect(includeExactLocation = false) {
  return {
    ...(includeExactLocation ? ownerItemSelect : publicItemSelect),
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
        id: true, password: true, role: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'USER') return res.status(403).json({ error: 'Administrator accounts must be transferred or removed by another administrator' });

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    // This is a confirmation failure, not an expired/invalid API session. A
    // 401 would make the frontend auth interceptor clear an otherwise valid
    // login and redirect the member away from Settings.
    if (!validPassword) return res.status(400).json({ error: 'Password is incorrect' });

    // Lock the account before taking the final relation snapshot. This prevents
    // a concurrent item/chat insert from appearing after the snapshot and
    // leaving assets or a one-participant conversation behind.
    const assets = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw`
        SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE
      `;
      if (!locked.length) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
      }

      const current = await tx.user.findUnique({
        where: { id: user.id },
        select: {
          password: true, role: true, avatarPublicId: true,
          items: { select: { images: { select: { publicId: true } } } },
          chatParticipants: { select: { chatId: true } },
          claimsSubmitted: {
            where: { status: 'PENDING' },
            select: { itemId: true },
          },
        },
      });
      if (!current) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
      }
      if (current.role !== 'USER') {
        const error = new Error('Administrator accounts must be transferred or removed by another administrator');
        error.status = 403;
        throw error;
      }
      if (current.password !== user.password) {
        const error = new Error('Account credentials changed. Confirm deletion again.');
        error.status = 409;
        throw error;
      }

      const chatIds = [...new Set(current.chatParticipants.map((participant) => participant.chatId))];
      if (chatIds.length) {
        // A chat is a private two-party record. Delete the complete chat before
        // deleting either participant so messages are not left attached to the
        // other member as a one-person conversation.
        await tx.chat.deleteMany({ where: { id: { in: chatIds } } });
      }
      await tx.user.delete({ where: { id: user.id } });

      const affectedItemIds = [...new Set(current.claimsSubmitted.map(claim => claim.itemId))];
      if (affectedItemIds.length) {
        const remaining = await tx.claim.groupBy({
          by: ['itemId'],
          where: { itemId: { in: affectedItemIds }, status: 'PENDING' },
          _count: { _all: true },
        });
        const stillPending = new Set(remaining.map(row => row.itemId));
        const releasedItemIds = affectedItemIds.filter(itemId => !stillPending.has(itemId));
        if (releasedItemIds.length) {
          await tx.item.updateMany({
            where: {
              id: { in: releasedItemIds },
              status: 'CLAIM_PENDING',
              deletedAt: null,
              claims: { none: { status: 'PENDING' } },
            },
            data: { status: 'ACTIVE' },
          });
        }
      }

      return [
        ...(current.avatarPublicId ? [current.avatarPublicId] : []),
        ...current.items.flatMap((item) => item.images.map((image) => image.publicId)),
      ];
    });
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
      prisma.item.groupBy({ by: ['status'], where: { userId: req.user.id, deletedAt: null }, _count: { _all: true } }),
      prisma.claim.count({ where: { claimantId: req.user.id } }),
      prisma.item.findMany({
        where: { userId: req.user.id, deletedAt: null },
        take: 4,
        orderBy: { createdAt: 'desc' },
        select: itemListSelect(true),
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
  query('page').optional().isInt({ min: 1, max: 1000 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
], validate, async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const pagination = getPagination(req.query, { defaultLimit: 12, maxLimit: 50 });
    const where = {
      userId: req.user.id,
      deletedAt: null,
      ...(type && { type }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        select: itemListSelect(true),
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
  param('id').isUUID().withMessage('Valid user id required'),
  query('type').optional().isIn(ITEM_TYPES),
  query('status').optional().isIn(ITEM_STATUSES),
  query('page').optional().isInt({ min: 1, max: 1000 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
], validate, async (req, res, next) => {
  try {
    const { type, status = 'ACTIVE', page = 1, limit = 12 } = req.query;
    const pagination = getPagination({ page, limit }, { defaultLimit: 12, maxLimit: 50 });

    const where = {
      userId: req.params.id,
      user: { isBanned: false },
      isApproved: true,
      deletedAt: null,
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

    res.json({ items: items.map(withPublicLocation), ...paginationResult(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id — public profile (must be last; matches any string as id)
router.get('/:id', [
  param('id').isUUID().withMessage('Valid user id required'),
], validate, async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, isBanned: false },
      select: {
        id: true, name: true, avatarUrl: true, bio: true,
        location: true, createdAt: true,
        _count: { select: { items: { where: { isApproved: true, deletedAt: null, status: { not: 'REJECTED' } } } } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

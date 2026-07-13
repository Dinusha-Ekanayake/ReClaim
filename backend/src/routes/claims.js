const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { emitNotification } = require('../services/notificationService');
const { reviewClaim } = require('../services/claimReviewService');
const prisma = require('../lib/prisma');
const { getPagination, paginationResult } = require('../utils/query');
const { publicItemSelect, ownerItemSelect, primaryImageSelect } = require('../utils/selects');

const FALLBACK_QUESTIONS = [
  'Describe a detail or marking that is not visible in the listing photos.',
  'Where and when did you last have this item?',
  'What else would help the finder confirm that this belongs to you?',
];

const answerValidator = body('verificationAnswers').custom((answers) => {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw new Error('Verification answers must be an object');
  }
  const entries = Object.entries(answers);
  if (entries.length < 1 || entries.length > 5) throw new Error('Provide between 1 and 5 verification answers');
  if (entries.some(([key, value]) => !/^q\d+$/.test(key) || typeof value !== 'string' || value.trim().length < 2 || value.length > 500)) {
    throw new Error('Each verification answer must be between 2 and 500 characters');
  }
  return true;
});

// POST /api/claims — submit a claim for a found item
router.post('/',
  authenticate,
  [
    body('itemId').isUUID().withMessage('Valid item id required'),
    answerValidator,
    body('message').optional().trim().isLength({ max: 500 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { itemId, verificationAnswers, message } = req.body;

      const item = await prisma.item.findFirst({
        where: { id: itemId, user: { isBanned: false } },
        select: {
          id: true, userId: true, title: true, type: true, status: true,
          isApproved: true, verificationHints: true,
        },
      });

      if (!item) return res.status(404).json({ error: 'Item not found' });
      if (item.type !== 'FOUND') return res.status(400).json({ error: 'Can only claim FOUND items' });
      if (!item.isApproved) return res.status(404).json({ error: 'Item not found' });
      if (item.userId === req.user.id) return res.status(400).json({ error: 'Cannot claim your own item' });
      if (['RETURNED', 'CLOSED', 'REJECTED'].includes(item.status)) {
        return res.status(400).json({ error: 'Item is no longer available' });
      }

      const configuredQuestions = item.verificationHints
        .filter((value) => value.startsWith('question:'))
        .map((value) => value.slice('question:'.length));
      const questions = configuredQuestions.length ? configuredQuestions : FALLBACK_QUESTIONS;
      const expectedKeys = questions.map((_, index) => `q${index}`);
      const receivedKeys = Object.keys(verificationAnswers).sort();
      if (receivedKeys.length !== expectedKeys.length || expectedKeys.some((key) => !receivedKeys.includes(key))) {
        return res.status(400).json({ error: 'Answer every ownership question shown for this item' });
      }
      const usedSnapshotKeys = new Map();
      const answerSnapshot = Object.fromEntries(questions.map((question, index) => {
        const seen = usedSnapshotKeys.get(question) || 0;
        usedSnapshotKeys.set(question, seen + 1);
        const key = seen === 0 ? question : `${question} (${seen + 1})`;
        return [key, verificationAnswers[`q${index}`].trim()];
      }));

      let ownerNotification = null;
      const claim = await prisma.$transaction(async (tx) => {
        const availability = await tx.item.updateMany({
          where: {
            id: itemId,
            status: { in: ['ACTIVE', 'MATCHED', 'CLAIM_PENDING'] },
            isApproved: true,
            deletedAt: null,
            user: { isBanned: false },
          },
          data: { status: 'CLAIM_PENDING' },
        });
        if (availability.count !== 1) {
          const error = new Error('Item is no longer available');
          error.status = 409;
          throw error;
        }
        const createdClaim = await tx.claim.create({
          data: { itemId, claimantId: req.user.id, verificationAnswers: answerSnapshot, message },
          include: { claimant: { select: { id: true, name: true, avatarUrl: true } } },
        });
        ownerNotification = await tx.notification.create({
          data: {
            userId: item.userId,
            type: 'CLAIM_SUBMITTED',
            title: 'New claim on your found item',
            body: `${req.user.name} has submitted a claim for "${item.title}"`,
            link: '/dashboard/claims',
          },
        });
        return createdClaim;
      });

      emitNotification(ownerNotification);

      res.status(201).json(claim);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/claims/item/:itemId — get claims for an item (owner only)
router.get('/item/:itemId', authenticate, [
  param('itemId').isUUID().withMessage('Valid item id required'),
  query('page').optional().isInt({ min: 1, max: 1000 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
], validate, async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.userId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const pagination = getPagination(req.query, { defaultLimit: 20, maxLimit: 50 });
    const where = { itemId };
    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        include: {
          claimant: { select: { id: true, name: true, avatarUrl: true, createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.claim.count({ where }),
    ]);

    res.json({ claims, ...paginationResult(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/claims/my — get claims submitted by current user
router.get('/my', authenticate, [
  query('page').optional().isInt({ min: 1, max: 1000 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
], validate, async (req, res, next) => {
  try {
    const pagination = getPagination(req.query, { defaultLimit: 20, maxLimit: 50 });
    const where = { claimantId: req.user.id };
    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        include: {
          item: { select: { ...publicItemSelect, images: primaryImageSelect } },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.claim.count({ where }),
    ]);
    res.json({ claims, ...paginationResult(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/claims/received — claims on items owned by the current user.
router.get('/received', authenticate, [
  query('page').optional().isInt({ min: 1, max: 1000 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
], validate, async (req, res, next) => {
  try {
    const pagination = getPagination(req.query, { defaultLimit: 20, maxLimit: 50 });
    const where = { item: { userId: req.user.id } };
    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          claimant: { select: { id: true, name: true, avatarUrl: true, createdAt: true } },
          item: { select: { ...ownerItemSelect, verificationHints: true, images: primaryImageSelect } },
        },
      }),
      prisma.claim.count({ where }),
    ]);
    res.json({ claims, ...paginationResult(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/claims/:id — approve or reject claim (item owner)
router.patch('/:id', authenticate, [
  param('id').isUUID().withMessage('Valid claim id required'),
  body('status').isIn(['APPROVED', 'REJECTED']),
  body('adminNote').optional({ nullable: true }).trim().isLength({ max: 500 }),
], validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }

    const result = await reviewClaim({
      claimId: id,
      status,
      adminNote,
      reviewerId: req.user.id,
      reviewerRole: req.user.role,
    });

    result.notifications.forEach(emitNotification);
    res.json(result.claim);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

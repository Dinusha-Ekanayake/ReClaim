const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createNotification } = require('../services/notificationService');
const prisma = require('../lib/prisma');
const { getPagination, paginationResult } = require('../utils/query');
const { publicItemSelect, primaryImageSelect } = require('../utils/selects');

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
    body('itemId').notEmpty(),
    answerValidator,
    body('message').optional().trim().isLength({ max: 500 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { itemId, verificationAnswers, message } = req.body;

      const item = await prisma.item.findUnique({
        where: { id: itemId },
        select: { id: true, userId: true, title: true, type: true, status: true, isApproved: true },
      });

      if (!item) return res.status(404).json({ error: 'Item not found' });
      if (item.type !== 'FOUND') return res.status(400).json({ error: 'Can only claim FOUND items' });
      if (!item.isApproved) return res.status(404).json({ error: 'Item not found' });
      if (item.userId === req.user.id) return res.status(400).json({ error: 'Cannot claim your own item' });
      if (['RETURNED', 'CLOSED', 'REJECTED'].includes(item.status)) {
        return res.status(400).json({ error: 'Item is no longer available' });
      }

      const claim = await prisma.$transaction(async (tx) => {
        const availability = await tx.item.updateMany({
          where: { id: itemId, status: { in: ['ACTIVE', 'MATCHED', 'CLAIM_PENDING'] }, isApproved: true },
          data: { status: 'CLAIM_PENDING' },
        });
        if (availability.count !== 1) {
          const error = new Error('Item is no longer available');
          error.status = 409;
          throw error;
        }
        return tx.claim.create({
          data: { itemId, claimantId: req.user.id, verificationAnswers, message },
          include: { claimant: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        });
      });

      // Notify item owner
      await createNotification(
        item.userId, 'CLAIM_SUBMITTED',
        'New claim on your found item',
        `${req.user.name} has submitted a claim for "${item.title}"`,
        `/dashboard/claims`
      );

      res.status(201).json(claim);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/claims/item/:itemId — get claims for an item (owner only)
router.get('/item/:itemId', authenticate, async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.userId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const claims = await prisma.claim.findMany({
      where: { itemId },
      include: {
        claimant: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(claims);
  } catch (err) {
    next(err);
  }
});

// GET /api/claims/my — get claims submitted by current user
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const claims = await prisma.claim.findMany({
      where: { claimantId: req.user.id },
      include: {
        item: { select: { ...publicItemSelect, images: primaryImageSelect } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(claims);
  } catch (err) {
    next(err);
  }
});

// GET /api/claims/received — claims on items owned by the current user.
router.get('/received', authenticate, async (req, res, next) => {
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
          claimant: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } },
          item: { select: { ...publicItemSelect, verificationHints: true, images: primaryImageSelect } },
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
  body('status').isIn(['APPROVED', 'REJECTED']),
  body('adminNote').optional({ nullable: true }).trim().isLength({ max: 500 }),
], validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: { item: true, claimant: true },
    });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    const isOwner = claim.item.userId === req.user.id;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    if (claim.status !== 'PENDING') return res.status(409).json({ error: 'Claim has already been reviewed' });
    const displacedClaims = status === 'APPROVED'
      ? await prisma.claim.findMany({
          where: { itemId: claim.itemId, id: { not: id }, status: 'PENDING' },
          select: { claimantId: true },
        })
      : [];

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.claim.updateMany({
        where: { id, status: 'PENDING' },
        data: { status, adminNote, reviewedAt: new Date(), reviewedBy: req.user.id },
      });
      if (result.count !== 1) {
        const error = new Error('Claim has already been reviewed');
        error.status = 409;
        throw error;
      }

      if (status === 'APPROVED') {
        await tx.claim.updateMany({
          where: { itemId: claim.itemId, id: { not: id }, status: 'PENDING' },
          data: { status: 'REJECTED', adminNote: 'Another claim was approved', reviewedAt: new Date(), reviewedBy: req.user.id },
        });
        await tx.item.update({ where: { id: claim.itemId }, data: { status: 'RETURNED' } });
      } else {
        const pending = await tx.claim.count({ where: { itemId: claim.itemId, status: 'PENDING' } });
        await tx.item.update({ where: { id: claim.itemId }, data: { status: pending > 0 ? 'CLAIM_PENDING' : 'ACTIVE' } });
      }

      return tx.claim.findUnique({ where: { id } });
    });

    if (status === 'APPROVED') {
      await createNotification(
        claim.claimantId, 'CLAIM_APPROVED',
        'Your claim was approved! 🎉',
        `Your claim for "${claim.item.title}" has been approved. Please coordinate with the finder.`,
        `/items/${claim.itemId}`
      );
      await Promise.all(displacedClaims.map((other) => createNotification(
        other.claimantId, 'CLAIM_REJECTED', 'Claim not approved',
        `Another claim for "${claim.item.title}" was approved.`, `/items/${claim.itemId}`
      )));
    } else {
      await createNotification(
        claim.claimantId, 'CLAIM_REJECTED',
        'Claim not approved',
        `Your claim for "${claim.item.title}" was not approved.`,
        `/items/${claim.itemId}`
      );
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

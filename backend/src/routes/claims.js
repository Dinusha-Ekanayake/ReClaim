const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createNotification } = require('../services/notificationService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// POST /api/claims — submit a claim for a found item
router.post('/',
  authenticate,
  [
    body('itemId').notEmpty(),
    body('verificationAnswers').isObject(),
    body('message').optional().isLength({ max: 500 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { itemId, verificationAnswers, message } = req.body;

      const item = await prisma.item.findUnique({
        where: { id: itemId },
        select: { id: true, userId: true, title: true, type: true, status: true },
      });

      if (!item) return res.status(404).json({ error: 'Item not found' });
      if (item.type !== 'FOUND') return res.status(400).json({ error: 'Can only claim FOUND items' });
      if (item.userId === req.user.id) return res.status(400).json({ error: 'Cannot claim your own item' });
      if (['RETURNED', 'CLOSED', 'REJECTED'].includes(item.status)) {
        return res.status(400).json({ error: 'Item is no longer available' });
      }

      // Check existing claim
      const existing = await prisma.claim.findFirst({
        where: { itemId, claimantId: req.user.id },
      });
      if (existing) return res.status(409).json({ error: 'You have already submitted a claim for this item' });

      const claim = await prisma.claim.create({
        data: {
          itemId,
          claimantId: req.user.id,
          verificationAnswers,
          message,
        },
        include: {
          claimant: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });

      // Update item status
      await prisma.item.update({ where: { id: itemId }, data: { status: 'CLAIM_PENDING' } });

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
        item: {
          include: { images: { where: { isPrimary: true }, take: 1 } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(claims);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/claims/:id — approve or reject claim (item owner)
router.patch('/:id', authenticate, async (req, res, next) => {
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

    const updated = await prisma.claim.update({
      where: { id },
      data: {
        status,
        adminNote,
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
      },
    });

    // Update item status
    if (status === 'APPROVED') {
      await prisma.item.update({ where: { id: claim.itemId }, data: { status: 'RETURNED' } });
      await createNotification(
        claim.claimantId, 'CLAIM_APPROVED',
        'Your claim was approved! 🎉',
        `Your claim for "${claim.item.title}" has been approved. Please coordinate with the finder.`,
        `/items/${claim.itemId}`
      );
    } else {
      await prisma.item.update({ where: { id: claim.itemId }, data: { status: 'ACTIVE' } });
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

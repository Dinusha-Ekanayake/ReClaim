const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { uploadAvatar } = require('../services/cloudinaryService');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/users/:id — public profile
router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, avatarUrl: true, bio: true,
        location: true, createdAt: true,
        _count: { select: { items: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id/items
router.get('/:id/items', async (req, res, next) => {
  try {
    const { type, status = 'ACTIVE', page = 1, limit = 12 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      userId: req.params.id,
      isApproved: true,
      ...(type && { type }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { images: { where: { isPrimary: true }, take: 1 } },
      }),
      prisma.item.count({ where }),
    ]);

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me — update profile
router.patch('/me', authenticate, async (req, res, next) => {
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
    const { url } = await uploadAvatar(req.file.buffer);
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: url },
      select: { id: true, avatarUrl: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

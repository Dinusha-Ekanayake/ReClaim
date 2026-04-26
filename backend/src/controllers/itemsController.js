const { PrismaClient } = require('@prisma/client');
const { computeMatches } = require('../services/matchingService');
const { generateEmbedding } = require('../services/embeddingService');
const { createNotification } = require('../services/notificationService');

const prisma = new PrismaClient();

const ITEMS_PER_PAGE = 12;

const CATEGORIES = [
  'Electronics', 'Bags & Wallets', 'Clothing & Accessories', 'Jewelry',
  'Keys', 'Documents & Cards', 'Books & Stationery', 'Sports Equipment',
  'Pets', 'Vehicles', 'Musical Instruments', 'Toys & Games', 'Other',
];

// GET /api/items
exports.list = async (req, res, next) => {
  try {
    const {
      type, category, status = 'ACTIVE', search,
      page = 1, limit = ITEMS_PER_PAGE,
      lat, lng, radius, // km
      dateFrom, dateTo, color, brand,
      sort = 'createdAt', order = 'desc',
    } = req.query;

    const where = {
      isApproved: true,
      ...(type && { type }),
      ...(category && { category }),
      ...(status && { status }),
      ...(color && { color: { contains: color, mode: 'insensitive' } }),
      ...(brand && { brand: { contains: brand, mode: 'insensitive' } }),
      ...(dateFrom || dateTo ? {
        dateLostFound: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) }),
        },
      } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { locationLabel: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sort]: order },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          user: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { comments: true, claims: true } },
        },
      }),
      prisma.item.count({ where }),
    ]);

    // Remove verification hints from public response
    const safeItems = items.map(({ verificationHints, embedding, ...item }) => item);

    res.json({
      items: safeItems,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/items/:id
exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        images: true,
        user: {
          select: {
            id: true, name: true, avatarUrl: true,
            phone: true, showPhone: true, createdAt: true,
            _count: { select: { items: true } },
          },
        },
        _count: { select: { comments: true, claims: true } },
      },
    });

    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (!item.isApproved && item.userId !== userId && !['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role)) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Hide verification hints unless owner or admin
    const isOwner = userId === item.userId;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);

    const { verificationHints, embedding, ...safeItem } = item;

    // Only show phone if user allowed it
    if (!item.user.showPhone) {
      safeItem.user = { ...safeItem.user, phone: null };
    }

    res.json({
      ...safeItem,
      ...(isOwner || isAdmin ? { verificationHints } : {}),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/items
exports.create = async (req, res, next) => {
  try {
    const {
      type, title, description, category, subcategory,
      brand, color, size, locationLabel, locationLat, locationLng,
      locationArea, dateLostFound, verificationHints = [],
      showContactInfo = false, imageUrls = [], imagePublicIds = [],
    } = req.body;

    // Generate AI embedding (optional, won't fail if unavailable)
    let embedding = null;
    try {
      embedding = await generateEmbedding(`${title} ${description} ${category} ${brand || ''} ${color || ''}`);
    } catch {}

    const item = await prisma.item.create({
      data: {
        type,
        title,
        description,
        category,
        subcategory,
        brand,
        color,
        size,
        locationLabel,
        locationLat: locationLat ? parseFloat(locationLat) : null,
        locationLng: locationLng ? parseFloat(locationLng) : null,
        locationArea,
        dateLostFound: new Date(dateLostFound),
        userId: req.user.id,
        verificationHints,
        showContactInfo,
        embedding,
        images: {
          create: imageUrls.map((url, i) => ({
            url,
            publicId: imagePublicIds[i] || '',
            isPrimary: i === 0,
          })),
        },
      },
      include: {
        images: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Async: compute matches (don't await to keep response fast)
    computeMatches(item.id).catch(console.error);

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

// PUT /api/items/:id
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.item.findUnique({ where: { id } });

    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.userId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const {
      title, description, category, subcategory, brand, color, size,
      locationLabel, locationLat, locationLng, locationArea,
      dateLostFound, verificationHints, showContactInfo,
    } = req.body;

    const updated = await prisma.item.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(category && { category }),
        subcategory,
        brand,
        color,
        size,
        ...(locationLabel && { locationLabel }),
        ...(locationLat !== undefined && { locationLat: parseFloat(locationLat) }),
        ...(locationLng !== undefined && { locationLng: parseFloat(locationLng) }),
        locationArea,
        ...(dateLostFound && { dateLostFound: new Date(dateLostFound) }),
        ...(verificationHints && { verificationHints }),
        ...(showContactInfo !== undefined && { showContactInfo }),
      },
      include: { images: true, user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/items/:id
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.item.findUnique({ where: { id } });

    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.userId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.item.delete({ where: { id } });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/items/:id/status
exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const VALID = ['ACTIVE', 'MATCHED', 'CLAIM_PENDING', 'RETURNED', 'CLOSED'];
    if (!VALID.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.userId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await prisma.item.update({
      where: { id },
      data: { status },
    });

    // Notify owner on RETURNED
    if (status === 'RETURNED') {
      await createNotification(item.userId, 'ITEM_RETURNED',
        'Item marked as returned! 🎉',
        `Your item "${item.title}" has been marked as returned.`,
        `/items/${item.id}`
      );
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

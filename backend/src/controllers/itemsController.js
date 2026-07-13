const prisma = require('../lib/prisma');
const { computeMatches } = require('../services/matchingService');
const { generateEmbedding } = require('../services/embeddingService');
const { createNotification } = require('../services/notificationService');
const { getPagination, paginationResult } = require('../utils/query');
const { publicItemSelect, publicUserSelect, primaryImageSelect } = require('../utils/selects');

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

    const pagination = getPagination({ page, limit }, { defaultLimit: ITEMS_PER_PAGE, maxLimit: 50 });

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { [sort]: order },
        select: {
          ...publicItemSelect,
          images: primaryImageSelect,
          user: { select: publicUserSelect },
          _count: { select: { comments: { where: { isHidden: false } } } },
        },
      }),
      prisma.item.count({ where }),
    ]);

    res.json({
      items,
      pagination: paginationResult(total, pagination.page, pagination.limit),
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
    const isPrivileged = item.userId === userId || ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);
    if ((!item.isApproved || item.status === 'REJECTED') && !isPrivileged) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Hide verification hints unless owner or admin
    const isOwner = userId === item.userId;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);

    const { verificationHints, embedding, ...safeItem } = item;

    // Only show phone if user allowed it
    if (!isPrivileged && (!item.user.showPhone || !item.showContactInfo)) {
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
        locationLat: locationLat !== undefined && locationLat !== null ? Number(locationLat) : null,
        locationLng: locationLng !== undefined && locationLng !== null ? Number(locationLng) : null,
        locationArea,
        dateLostFound: new Date(dateLostFound),
        userId: req.user.id,
        verificationHints: type === 'FOUND' ? verificationHints : [],
        showContactInfo,
        images: {
          create: imageUrls.map((url, i) => ({
            url,
            publicId: imagePublicIds[i],
            isPrimary: i === 0,
          })),
        },
      },
      include: {
        images: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Enrichment and matching run outside the request's critical path.
    generateEmbedding(`${title} ${description} ${category} ${brand || ''} ${color || ''}`)
      .then((embedding) => prisma.item.update({ where: { id: item.id }, data: { embedding } }))
      .then(() => computeMatches(item.id))
      .catch((err) => console.error('Failed to compute item matches:', err.message));

    const { embedding: ignoredEmbedding, ...safeItem } = item;
    res.status(201).json(safeItem);
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
        ...(locationLat !== undefined && { locationLat: locationLat === null ? null : Number(locationLat) }),
        ...(locationLng !== undefined && { locationLng: locationLng === null ? null : Number(locationLng) }),
        locationArea,
        ...(dateLostFound && { dateLostFound: new Date(dateLostFound) }),
        ...(verificationHints !== undefined && { verificationHints: item.type === 'FOUND' ? verificationHints : [] }),
        ...(showContactInfo !== undefined && { showContactInfo }),
      },
      include: { images: true, user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    const matchingFieldsChanged = [title, description, category, brand, color, locationLat, locationLng, locationLabel, dateLostFound]
      .some((value) => value !== undefined);
    if (matchingFieldsChanged) {
      generateEmbedding(`${updated.title} ${updated.description} ${updated.category} ${updated.brand || ''} ${updated.color || ''}`)
        .then((embedding) => prisma.item.update({ where: { id }, data: { embedding } }))
        .then(() => computeMatches(id))
        .catch((err) => console.error('Failed to refresh item matching:', err.message));
    }

    const { embedding: ignoredEmbedding, ...safeUpdated } = updated;
    res.json(safeUpdated);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/items/:id
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.item.findUnique({ where: { id }, include: { images: { select: { publicId: true } } } });

    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.userId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.item.delete({ where: { id } });
    const { deleteFromCloudinary } = require('../services/cloudinaryService');
    await Promise.all(item.images.filter((image) => image.publicId).map((image) => deleteFromCloudinary(image.publicId)));
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

    const VALID = ['ACTIVE', 'MATCHED', 'CLAIM_PENDING', 'RETURNED', 'CLOSED', 'REJECTED'];
    if (!VALID.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.userId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role) && !['ACTIVE', 'RETURNED', 'CLOSED'].includes(status)) {
      return res.status(403).json({ error: 'This status can only be set by the claim and matching workflows' });
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

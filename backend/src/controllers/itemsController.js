const prisma = require('../lib/prisma');
const { Prisma } = require('@prisma/client');
const { MATCHABLE_ITEM_STATUSES } = require('../services/matchingService');
const { emitNotification } = require('../services/notificationService');
const {
  cleanupPendingUploads,
  consumePendingUploads,
  queueAssetsForCleanup,
  receiptsFromImageEntries,
  receiptsFromLegacyArrays,
} = require('../services/pendingUploadService');
const { statusTransitionError } = require('../services/itemLifecycleService');
const { calendarDateToUtc } = require('../utils/calendarDate');
const { getPagination, paginationResult } = require('../utils/query');
const {
  publicItemSelect,
  ownerItemSelect,
  publicUserSelect,
  primaryImageSelect,
  withPublicLocation,
} = require('../utils/selects');

const ITEMS_PER_PAGE = 12;

function withoutInternalMatchingState(item) {
  const {
    embedding,
    matchingPending,
    matchingLockedAt,
    matchingRetryAt,
    matchingAttempts,
    matchingLastError,
    ...safeItem
  } = item;
  return safeItem;
}

function sameScalar(current, next) {
  if (next === undefined) return true;
  if (next === null) return current === null;
  return String(current ?? '') === String(next);
}

function sameNumber(current, next) {
  if (next === undefined) return true;
  if (next === null || next === '') return current === null;
  return Number(current) === Number(next);
}

function sameStringArray(current = [], next = []) {
  return current.length === next.length && current.every((value, index) => value === next[index]);
}

const CATEGORIES = [
  'Electronics', 'Bags & Wallets', 'Clothing & Accessories', 'Jewelry',
  'Keys', 'Documents & Cards', 'Books & Stationery', 'Sports Equipment',
  'Pets', 'Vehicles', 'Musical Instruments', 'Toys & Games', 'Other',
];

// GET /api/items
exports.list = async (req, res, next) => {
  try {
    const {
      type, category, status, search,
      page = 1, limit = ITEMS_PER_PAGE,
      dateFrom, dateTo, color, brand,
      sort = 'createdAt', order = 'desc',
    } = req.query;

    const where = {
      isApproved: true,
      deletedAt: null,
      user: { isBanned: false },
      ...(type && { type }),
      ...(category && { category }),
      ...(status ? { status } : { status: { in: ['ACTIVE', 'MATCHED', 'CLAIM_PENDING'] } }),
      ...(color && { color: { contains: color, mode: 'insensitive' } }),
      ...(brand && { brand: { contains: brand, mode: 'insensitive' } }),
      ...(dateFrom || dateTo ? {
        dateLostFound: {
          ...(dateFrom && { gte: calendarDateToUtc(dateFrom) }),
          ...(dateTo && { lte: calendarDateToUtc(dateTo) }),
        },
      } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { locationArea: { contains: search, mode: 'insensitive' } },
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
      items: items.map(withPublicLocation),
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
      select: {
        ...ownerItemSelect,
        verificationHints: true,
        adminNote: true,
        deletedAt: true,
        images: { orderBy: { position: 'asc' } },
        user: {
          select: {
            id: true, name: true, avatarUrl: true,
            phone: true, showPhone: true, isBanned: true, createdAt: true,
            _count: {
              select: {
                items: {
                  where: {
                    isApproved: true,
                    deletedAt: null,
                    status: { not: 'REJECTED' },
                  },
                },
              },
            },
          },
        },
        _count: { select: { comments: { where: { isHidden: false } } } },
      },
    });

    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.deletedAt) return res.status(404).json({ error: 'Item not found' });
    const isOwner = userId === item.userId;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);
    const isPrivileged = isOwner || isAdmin;
    if ((!item.isApproved || item.status === 'REJECTED' || item.user.isBanned) && !isPrivileged) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Legacy verification hints may contain the expected answer. Only values
    // explicitly stored with the question prefix are safe to show to claimants.
    const { verificationHints, ...safeItemWithMatchingState } = item;
    const safeItem = withoutInternalMatchingState(safeItemWithMatchingState);
    const { isBanned: ignoredOwnerBan, ...safeOwner } = safeItem.user;
    safeItem.user = safeOwner;
    if (!isPrivileged) delete safeItem.adminNote;
    if (isPrivileged) {
      const [comments, claims] = await Promise.all([
        prisma.comment.count({ where: { itemId: item.id } }),
        prisma.claim.count({ where: { itemId: item.id } }),
      ]);
      safeItem._count = { comments, claims };
    } else {
      // Explicitly shape this response as a final defense against stale ORM
      // selections or future relation-count additions leaking claim activity.
      safeItem._count = { comments: safeItem._count?.comments || 0 };
    }
    const verificationQuestions = verificationHints
      .filter((value) => value.startsWith('question:'))
      .map((value) => value.slice('question:'.length));
    const viewerHasClaim = Boolean(userId && !isOwner && item.type === 'FOUND' && await prisma.claim.findUnique({
      where: { itemId_claimantId: { itemId: item.id, claimantId: userId } },
      select: { id: true },
    }));

    if (!isPrivileged) {
      safeItem.locationLabel = safeItem.locationArea || 'Location shared privately';
      if (Number.isFinite(safeItem.locationLat)) safeItem.locationLat = Number(safeItem.locationLat.toFixed(2));
      if (Number.isFinite(safeItem.locationLng)) safeItem.locationLng = Number(safeItem.locationLng.toFixed(2));
    }

    // Only show phone if user allowed it
    if (!isPrivileged && (!item.user.showPhone || !item.showContactInfo)) {
      safeItem.user = { ...safeItem.user, phone: null };
    }

    res.json({
      ...safeItem,
      viewerHasClaim,
      ...(item.type === 'FOUND' ? { verificationQuestions } : {}),
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
      locationArea, dateLostFound, verificationHints = [], verificationQuestions = [],
      showContactInfo = false, imageUrls = [], imagePublicIds = [],
    } = req.body;

    const receipts = receiptsFromLegacyArrays(req.body, req.user.id);
    const item = await prisma.$transaction(async (tx) => {
      await consumePendingUploads(tx, req.user.id, receipts);
      return tx.item.create({
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
          dateLostFound: calendarDateToUtc(dateLostFound),
          userId: req.user.id,
          isApproved: false,
          matchingPending: false,
          verificationHints: type === 'FOUND'
            ? (verificationQuestions.length
                ? verificationQuestions.map((question) => `question:${question}`)
                : verificationHints)
            : [],
          showContactInfo,
          images: {
            create: imageUrls.map((url, index) => ({
              url,
              publicId: imagePublicIds[index],
              isPrimary: index === 0,
              position: index,
            })),
          },
        },
        include: {
          images: { orderBy: { position: 'asc' } },
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      });
    });

    res.status(201).json(withoutInternalMatchingState(item));
  } catch (err) {
    next(err);
  }
};

// PUT /api/items/:id
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: 'asc' } },
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.deletedAt) return res.status(404).json({ error: 'Item not found' });
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    if (item.userId !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const {
      title, description, category, subcategory, brand, color, size,
      locationLabel, locationLat, locationLng, locationArea,
      dateLostFound, verificationHints, verificationQuestions, showContactInfo,
    } = req.body;

    if (item.type === 'FOUND') {
      const suppliedQuestions = verificationQuestions !== undefined
        ? verificationQuestions
        : verificationHints;
      if (suppliedQuestions !== undefined && suppliedQuestions.length === 0) {
        return res.status(400).json({ error: 'Found items require at least one ownership question' });
      }
    }

    const replacesImages = Object.prototype.hasOwnProperty.call(req.body, 'images');
    const desiredImages = replacesImages ? req.body.images : [];
    if (replacesImages && (!Array.isArray(desiredImages) || desiredImages.length > 5)) {
      return res.status(400).json({ error: 'Images must be an ordered list of at most 5 entries' });
    }

    const currentImagesById = new Map(item.images.map((image) => [image.id, image]));
    const retainedIds = desiredImages
      .filter((image) => image.id)
      .map((image) => image.id);
    if (replacesImages && retainedIds.some((imageId) => !currentImagesById.has(imageId))) {
      return res.status(400).json({ error: 'An existing image does not belong to this item' });
    }
    if (new Set(retainedIds).size !== retainedIds.length) {
      return res.status(400).json({ error: 'Duplicate images are not allowed' });
    }

    const imagesChanged = replacesImages && (
      desiredImages.length !== item.images.length
      || desiredImages.some((image, index) => !image.id || image.id !== item.images[index]?.id)
    );
    const receipts = imagesChanged ? receiptsFromImageEntries(desiredImages, req.user.id) : [];
    const receiptByPublicId = new Map(receipts.map((receipt) => [receipt.publicId, receipt]));
    const removedImages = imagesChanged
      ? item.images.filter((image) => !retainedIds.includes(image.id))
      : [];
    let cleanupIds = [];
    const nextVerificationHints = verificationQuestions !== undefined || verificationHints !== undefined
      ? (item.type === 'FOUND'
          ? (verificationQuestions !== undefined
              ? verificationQuestions.map((question) => `question:${question}`)
              : verificationHints)
          : [])
      : item.verificationHints;
    const matchingFieldsChanged = !sameScalar(item.title, title)
      || !sameScalar(item.description, description)
      || !sameScalar(item.category, category)
      || !sameScalar(item.brand, brand)
      || !sameScalar(item.color, color)
      || !sameNumber(item.locationLat, locationLat)
      || !sameNumber(item.locationLng, locationLng)
      || !sameScalar(item.locationLabel, locationLabel)
      || !sameScalar(item.locationArea, locationArea)
      || (dateLostFound !== undefined
        && item.dateLostFound.toISOString().slice(0, 10) !== dateLostFound);
    const moderatedFieldsChanged = matchingFieldsChanged
      || !sameScalar(item.subcategory, subcategory)
      || !sameScalar(item.size, size)
      || !sameStringArray(item.verificationHints, nextVerificationHints)
      || imagesChanged;
    const contactVisibilityChanged = !sameScalar(item.showContactInfo, showContactInfo);

    // A PUT carrying the current normalized representation is a true no-op:
    // do not bump updatedAt, reorder browse results, or create a new moderation
    // revision merely because a client submitted a full form.
    if (!moderatedFieldsChanged && !contactVisibilityChanged) {
      return res.json(withoutInternalMatchingState(item));
    }
    // Every owner material edit is a new moderation revision, including edits
    // that began while the item was already pending review.
    const requiresRemoderation = !isAdmin && moderatedFieldsChanged;
    const remainsMatchable = item.isApproved
      && !requiresRemoderation
      && MATCHABLE_ITEM_STATUSES.includes(item.status);

    const updated = await prisma.$transaction(async (tx) => {
      if (moderatedFieldsChanged) {
        const revisionClaim = await tx.item.updateMany({
          where: { id, contentRevision: item.contentRevision, deletedAt: null },
          data: {
            contentRevision: { increment: 1 },
            ...(requiresRemoderation && {
              isApproved: false,
              adminNote: null,
              matchingPending: false,
              matchingLockedAt: null,
              matchingRetryAt: null,
              matchingAttempts: 0,
              matchingLastError: null,
            }),
          },
        });
        if (revisionClaim.count !== 1) {
          const error = new Error('This report changed in another session. Refresh and try again.');
          error.status = 409;
          throw error;
        }
      }

      if (imagesChanged) {
        await consumePendingUploads(tx, req.user.id, receipts);
        cleanupIds = await queueAssetsForCleanup(tx, item.userId, removedImages);

        if (removedImages.length) {
          await tx.itemImage.deleteMany({
            where: { itemId: id, id: { in: removedImages.map((image) => image.id) } },
          });
        }

        for (const [position, image] of desiredImages.entries()) {
          if (image.id) {
            await tx.itemImage.update({
              where: { id: image.id },
              data: { position, isPrimary: position === 0 },
            });
          } else {
            const receipt = receiptByPublicId.get(image.publicId);
            await tx.itemImage.create({
              data: {
                itemId: id,
                url: receipt.url,
                publicId: receipt.publicId,
                position,
                isPrimary: position === 0,
              },
            });
          }
        }
      }

      // Remove suggestions computed from content that has just changed. Owner
      // material edits go back through moderation before a new worker job can
      // publish matches; trusted admin edits are queued immediately.
      if (matchingFieldsChanged || requiresRemoderation) {
        await tx.match.deleteMany({
          where: { OR: [{ lostItemId: id }, { foundItemId: id }] },
        });
      }

      return tx.item.update({
        // The tombstone predicate also protects non-moderated updates (such as
        // contact visibility) from racing a concurrent deletion.
        where: { id, deletedAt: null },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(category !== undefined && { category }),
          ...(subcategory !== undefined && { subcategory }),
          ...(brand !== undefined && { brand }),
          ...(color !== undefined && { color }),
          ...(size !== undefined && { size }),
          ...(locationLabel !== undefined && { locationLabel }),
          ...(locationLat !== undefined && { locationLat: locationLat === null ? null : Number(locationLat) }),
          ...(locationLng !== undefined && { locationLng: locationLng === null ? null : Number(locationLng) }),
          ...(locationArea !== undefined && { locationArea }),
          ...(dateLostFound !== undefined && { dateLostFound: calendarDateToUtc(dateLostFound) }),
          ...((verificationQuestions !== undefined || verificationHints !== undefined)
            && !sameStringArray(item.verificationHints, nextVerificationHints)
            && { verificationHints: nextVerificationHints }),
          ...(contactVisibilityChanged && { showContactInfo }),
          ...(requiresRemoderation && {
            isApproved: false,
            adminNote: null,
            matchingPending: false,
            matchingLockedAt: null,
            matchingRetryAt: null,
            matchingAttempts: 0,
            matchingLastError: null,
          }),
          ...(matchingFieldsChanged && {
            embedding: Prisma.DbNull,
            matchingPending: remainsMatchable,
            matchingLockedAt: null,
            matchingRetryAt: null,
            matchingAttempts: 0,
            matchingLastError: null,
          }),
        },
        include: {
          images: { orderBy: { position: 'asc' } },
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      });
    });

    if (cleanupIds.length) {
      void cleanupPendingUploads({ ids: cleanupIds, limit: cleanupIds.length })
        .catch((error) => console.error('Failed to remove replaced item images:', error));
    }

    res.json(withoutInternalMatchingState(updated));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/items/:id
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.item.findUnique({
      where: { id },
      include: { images: { select: { url: true, publicId: true } } },
    });

    if (!item || item.deletedAt) return res.status(404).json({ error: 'Item not found' });
    if (item.userId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let cleanupIds = [];
    await prisma.$transaction(async (tx) => {
      const removed = await tx.item.updateMany({
        where: { id, deletedAt: null, contentRevision: item.contentRevision },
        data: {
          deletedAt: new Date(),
          isApproved: false,
          contentRevision: { increment: 1 },
          matchingPending: false,
          matchingLockedAt: null,
          matchingRetryAt: null,
          matchingAttempts: 0,
          matchingLastError: null,
        },
      });
      if (removed.count !== 1) {
        const error = new Error('This report changed in another session. Refresh and try again.');
        error.status = 409;
        throw error;
      }
      cleanupIds = await queueAssetsForCleanup(tx, item.userId, item.images);
      await Promise.all([
        tx.itemImage.deleteMany({ where: { itemId: id } }),
        tx.chat.deleteMany({ where: { itemId: id } }),
        tx.match.deleteMany({ where: { OR: [{ lostItemId: id }, { foundItemId: id }] } }),
      ]);
    });

    if (cleanupIds.length) {
      void cleanupPendingUploads({ ids: cleanupIds, limit: cleanupIds.length })
        .catch((error) => console.error('Failed to remove deleted item images:', error));
    }
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

    const item = await prisma.item.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        title: true,
        status: true,
        isApproved: true,
        deletedAt: true,
        claims: {
          where: { status: 'APPROVED' },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.deletedAt) return res.status(404).json({ error: 'Item not found' });
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    if (item.userId !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const transitionError = statusTransitionError(item.status, status, {
      isAdmin,
      hasApprovedClaim: item.claims.length > 0,
    });
    if (transitionError) {
      return res.status(transitionError.status).json({ error: transitionError.message });
    }

    if (item.status === status) {
      const unchanged = await prisma.item.findUnique({ where: { id } });
      return res.json(withoutInternalMatchingState(unchanged));
    }

    let notification = null;
    const updated = await prisma.$transaction(async (tx) => {
      const targetIsMatchable = item.isApproved && MATCHABLE_ITEM_STATUSES.includes(status);
      const transition = await tx.item.updateMany({
        where: {
          id,
          status: item.status,
          deletedAt: null,
          ...(status !== 'RETURNED' && { claims: { none: { status: 'APPROVED' } } }),
        },
        data: {
          status,
          matchingPending: targetIsMatchable,
          matchingLockedAt: null,
          matchingRetryAt: null,
          matchingAttempts: 0,
          matchingLastError: null,
        },
      });
      if (transition.count !== 1) {
        const error = new Error('Item status changed. Refresh and try again.');
        error.status = 409;
        throw error;
      }

      if (!targetIsMatchable) {
        await tx.match.deleteMany({
          where: { OR: [{ lostItemId: id }, { foundItemId: id }] },
        });
      }

      if (status === 'RETURNED' && item.userId !== req.user.id) {
        notification = await tx.notification.create({
          data: {
            userId: item.userId,
            type: 'ITEM_RETURNED',
            title: 'Item marked as returned!',
            body: `Your item "${item.title}" has been marked as returned.`,
            link: `/items/${item.id}`,
          },
        });
      }

      return tx.item.findUnique({ where: { id } });
    });

    if (notification) emitNotification(notification);

    res.json(withoutInternalMatchingState(updated));
  } catch (err) {
    next(err);
  }
};

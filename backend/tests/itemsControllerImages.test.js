jest.mock('../src/lib/prisma', () => ({
  $transaction: jest.fn(),
  item: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  itemImage: {
    deleteMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  match: { deleteMany: jest.fn() },
  chat: { deleteMany: jest.fn() },
}));
jest.mock('../src/services/pendingUploadService', () => ({
  cleanupPendingUploads: jest.fn(),
  consumePendingUploads: jest.fn(),
  queueAssetsForCleanup: jest.fn(),
  receiptsFromImageEntries: jest.fn(),
  receiptsFromLegacyArrays: jest.fn(),
}));
jest.mock('../src/services/matchingService', () => ({
  computeMatches: jest.fn(),
  MATCHABLE_ITEM_STATUSES: ['ACTIVE', 'MATCHED', 'CLAIM_PENDING'],
}));
jest.mock('../src/services/embeddingService', () => ({ generateEmbedding: jest.fn() }));
jest.mock('../src/services/notificationService', () => ({
  createNotification: jest.fn(),
  emitNotification: jest.fn(),
}));

const prisma = require('../src/lib/prisma');
const { Prisma } = require('@prisma/client');
const pendingUploads = require('../src/services/pendingUploadService');
const itemsController = require('../src/controllers/itemsController');

const ITEM_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = '22222222-2222-4222-8222-222222222222';
const FIRST_IMAGE_ID = '33333333-3333-4333-8333-333333333333';
const SECOND_IMAGE_ID = '44444444-4444-4444-8444-444444444444';

function responseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('item controller image transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((operation) => operation(prisma));
    prisma.item.updateMany.mockResolvedValue({ count: 1 });
    pendingUploads.cleanupPendingUploads.mockResolvedValue({ deleted: 1, failed: 0 });
  });

  test('atomically consumes new uploads, reorders retained images, and queues removals', async () => {
    const first = {
      id: FIRST_IMAGE_ID,
      url: 'https://res.cloudinary.com/demo/image/upload/first.webp',
      publicId: 'reclaim/items/first',
      position: 0,
      isPrimary: true,
    };
    const second = {
      id: SECOND_IMAGE_ID,
      url: 'https://res.cloudinary.com/demo/image/upload/second.webp',
      publicId: 'reclaim/items/second',
      position: 1,
      isPrimary: false,
    };
    const receipt = {
      id: 'new-upload',
      userId: OWNER_ID,
      url: 'https://res.cloudinary.com/demo/image/upload/new.webp',
      publicId: 'reclaim/items/new-upload',
    };
    prisma.item.findUnique.mockResolvedValue({
      id: ITEM_ID,
      userId: OWNER_ID,
      type: 'LOST',
      status: 'ACTIVE',
      isApproved: true,
      contentRevision: 1,
      images: [first, second],
    });
    prisma.item.update.mockResolvedValue({ id: ITEM_ID, images: [] });
    prisma.itemImage.deleteMany.mockResolvedValue({ count: 1 });
    prisma.itemImage.update.mockResolvedValue(second);
    prisma.itemImage.create.mockResolvedValue({ id: 'created-image', ...receipt });
    pendingUploads.receiptsFromImageEntries.mockReturnValue([receipt]);
    pendingUploads.queueAssetsForCleanup.mockResolvedValue(['cleanup-row']);

    const req = {
      params: { id: ITEM_ID },
      user: { id: OWNER_ID, role: 'USER' },
      body: {
        images: [
          { id: SECOND_IMAGE_ID },
          { url: receipt.url, publicId: receipt.publicId, uploadToken: 'signed-token' },
        ],
      },
    };
    const res = responseMock();
    const next = jest.fn();

    await itemsController.update(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(pendingUploads.consumePendingUploads).toHaveBeenCalledWith(prisma, OWNER_ID, [receipt]);
    expect(pendingUploads.queueAssetsForCleanup).toHaveBeenCalledWith(prisma, OWNER_ID, [first]);
    expect(prisma.itemImage.deleteMany).toHaveBeenCalledWith({
      where: { itemId: ITEM_ID, id: { in: [FIRST_IMAGE_ID] } },
    });
    expect(prisma.itemImage.update).toHaveBeenCalledWith({
      where: { id: SECOND_IMAGE_ID },
      data: { position: 0, isPrimary: true },
    });
    expect(prisma.itemImage.create).toHaveBeenCalledWith({
      data: {
        itemId: ITEM_ID,
        url: receipt.url,
        publicId: receipt.publicId,
        position: 1,
        isPrimary: false,
      },
    });
    expect(pendingUploads.cleanupPendingUploads).toHaveBeenCalledWith({
      ids: ['cleanup-row'],
      limit: 1,
    });
    expect(res.json).toHaveBeenCalledWith({ id: ITEM_ID, images: [] });
  });

  test('rejects an existing image id owned by another item before consuming receipts', async () => {
    prisma.item.findUnique.mockResolvedValue({
      id: ITEM_ID,
      userId: OWNER_ID,
      type: 'LOST',
      status: 'ACTIVE',
      isApproved: false,
      contentRevision: 1,
      images: [],
    });
    const req = {
      params: { id: ITEM_ID },
      user: { id: OWNER_ID, role: 'USER' },
      body: { images: [{ id: FIRST_IMAGE_ID }] },
    };
    const res = responseMock();

    await itemsController.update(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(pendingUploads.consumePendingUploads).not.toHaveBeenCalled();
  });

  test('returns an approved owner material edit to moderation and clears stale matching state', async () => {
    prisma.item.findUnique.mockResolvedValue({
      id: ITEM_ID,
      userId: OWNER_ID,
      type: 'LOST',
      status: 'ACTIVE',
      isApproved: true,
      contentRevision: 1,
      images: [],
    });
    prisma.item.update.mockResolvedValue({ id: ITEM_ID, title: 'Updated wallet report', images: [] });
    prisma.match.deleteMany.mockResolvedValue({ count: 2 });
    const req = {
      params: { id: ITEM_ID },
      user: { id: OWNER_ID, role: 'USER' },
      body: { title: 'Updated wallet report' },
    };
    const res = responseMock();

    await itemsController.update(req, res, jest.fn());

    expect(prisma.match.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ lostItemId: ITEM_ID }, { foundItemId: ITEM_ID }] },
    });
    expect(prisma.item.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        title: 'Updated wallet report',
        isApproved: false,
        adminNote: null,
        matchingPending: false,
        matchingLockedAt: null,
        matchingRetryAt: null,
        matchingAttempts: 0,
        matchingLastError: null,
      }),
    }));
    expect(prisma.item.update.mock.calls[0][0].data.embedding).toBe(Prisma.DbNull);
  });

  test('does not create a moderation revision for a normalized no-op save', async () => {
    const existing = {
      id: ITEM_ID,
      userId: OWNER_ID,
      type: 'LOST',
      title: 'Lost black wallet',
      description: 'A black leather wallet with several cards inside.',
      category: 'Bags & Wallets',
      subcategory: null,
      brand: 'Generic',
      color: 'Black',
      size: null,
      locationLabel: 'Fort Railway Station',
      locationArea: 'Colombo Fort',
      locationLat: 6.9344,
      locationLng: 79.8428,
      dateLostFound: new Date('2026-07-10T12:00:00.000Z'),
      verificationHints: [],
      showContactInfo: false,
      status: 'ACTIVE',
      isApproved: true,
      contentRevision: 4,
      deletedAt: null,
      images: [],
    };
    prisma.item.findUnique.mockResolvedValue(existing);
    prisma.item.update.mockResolvedValue(existing);

    const req = {
      params: { id: ITEM_ID },
      user: { id: OWNER_ID, role: 'USER' },
      body: {
        title: existing.title,
        description: existing.description,
        category: existing.category,
        subcategory: existing.subcategory,
        brand: existing.brand,
        color: existing.color,
        size: existing.size,
        locationLabel: existing.locationLabel,
        locationArea: existing.locationArea,
        locationLat: String(existing.locationLat),
        locationLng: String(existing.locationLng),
        dateLostFound: '2026-07-10',
        verificationQuestions: [],
        showContactInfo: false,
        images: [],
      },
    };
    const res = responseMock();

    await itemsController.update(req, res, jest.fn());

    expect(prisma.item.updateMany).not.toHaveBeenCalled();
    expect(prisma.match.deleteMany).not.toHaveBeenCalled();
    expect(prisma.item.update).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(existing);
  });

  test('does not allow a found report update to remove every ownership question', async () => {
    prisma.item.findUnique.mockResolvedValue({
      id: ITEM_ID,
      userId: OWNER_ID,
      type: 'FOUND',
      status: 'ACTIVE',
      isApproved: true,
      images: [],
    });
    const req = {
      params: { id: ITEM_ID },
      user: { id: OWNER_ID, role: 'USER' },
      body: { verificationQuestions: [] },
    };
    const res = responseMock();

    await itemsController.update(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('uses the canonical noon instant for inclusive date-only list bounds', async () => {
    prisma.item.findMany.mockResolvedValue([]);
    prisma.item.count.mockResolvedValue(0);
    const req = {
      query: { dateFrom: '2026-07-10', dateTo: '2026-07-13' },
    };
    const res = responseMock();

    await itemsController.list(req, res, jest.fn());

    expect(prisma.item.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        dateLostFound: {
          gte: new Date('2026-07-10T12:00:00.000Z'),
          lte: new Date('2026-07-13T12:00:00.000Z'),
        },
      }),
    }));
  });

  test('queues every attached asset in the same transaction as item deletion', async () => {
    const images = [{
      url: 'https://res.cloudinary.com/demo/image/upload/first.webp',
      publicId: 'reclaim/items/first',
    }];
    prisma.item.findUnique.mockResolvedValue({
      id: ITEM_ID,
      userId: OWNER_ID,
      contentRevision: 1,
      deletedAt: null,
      images,
    });
    prisma.item.delete.mockResolvedValue({ id: ITEM_ID });
    pendingUploads.queueAssetsForCleanup.mockResolvedValue(['cleanup-delete']);
    const req = {
      params: { id: ITEM_ID },
      user: { id: OWNER_ID, role: 'USER' },
    };
    const res = responseMock();

    await itemsController.remove(req, res, jest.fn());

    expect(pendingUploads.queueAssetsForCleanup).toHaveBeenCalledWith(prisma, OWNER_ID, images);
    expect(prisma.item.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: ITEM_ID, deletedAt: null, contentRevision: 1 },
      data: expect.objectContaining({ isApproved: false, matchingPending: false }),
    }));
    expect(prisma.itemImage.deleteMany).toHaveBeenCalledWith({ where: { itemId: ITEM_ID } });
    expect(prisma.chat.deleteMany).toHaveBeenCalledWith({ where: { itemId: ITEM_ID } });
    expect(pendingUploads.cleanupPendingUploads).toHaveBeenCalledWith({
      ids: ['cleanup-delete'],
      limit: 1,
    });
    expect(res.json).toHaveBeenCalledWith({ message: 'Item deleted' });
  });

  test('guards owner status updates against approved-claim and concurrent-state races', async () => {
    prisma.item.findUnique
      .mockResolvedValueOnce({
        id: ITEM_ID,
        userId: OWNER_ID,
        title: 'Lost wallet',
        status: 'ACTIVE',
        isApproved: true,
        claims: [],
      })
      .mockResolvedValueOnce({ id: ITEM_ID, status: 'CLOSED' });
    prisma.item.updateMany.mockResolvedValue({ count: 1 });
    const req = {
      params: { id: ITEM_ID },
      user: { id: OWNER_ID, role: 'USER' },
      body: { status: 'CLOSED' },
    };
    const res = responseMock();

    await itemsController.updateStatus(req, res, jest.fn());

    expect(prisma.item.updateMany).toHaveBeenCalledWith({
      where: {
        id: ITEM_ID,
        status: 'ACTIVE',
        claims: { none: { status: 'APPROVED' } },
        deletedAt: null,
      },
      data: {
        status: 'CLOSED',
        matchingPending: false,
        matchingLockedAt: null,
        matchingRetryAt: null,
        matchingAttempts: 0,
        matchingLastError: null,
      },
    });
    expect(prisma.match.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ lostItemId: ITEM_ID }, { foundItemId: ITEM_ID }] },
    });
    expect(res.json).toHaveBeenCalledWith({ id: ITEM_ID, status: 'CLOSED' });
  });
});

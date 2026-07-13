const express = require('express');
const request = require('supertest');

jest.mock('../src/lib/prisma', () => ({
  $transaction: jest.fn(),
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  item: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  claim: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  comment: { count: jest.fn() },
  chat: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  chatParticipant: { update: jest.fn() },
  message: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
  refreshToken: { deleteMany: jest.fn() },
}));

jest.mock('../src/middleware/auth', () => ({
  authenticate(req, res, next) {
    req.user = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Item owner',
      role: 'USER',
    };
    next();
  },
  optionalAuth(req, res, next) {
    next();
  },
}));

jest.mock('../src/services/cloudinaryService', () => ({
  upload: { single: jest.fn(() => (req, res, next) => next()) },
  uploadAvatar: jest.fn(),
  deleteFromCloudinary: jest.fn(),
}));
jest.mock('../src/controllers/authController', () => ({ clearAuthCookies: jest.fn() }));
jest.mock('../src/services/matchingService', () => ({
  getMatchesForItem: jest.fn(),
  computeMatches: jest.fn(),
}));
jest.mock('../src/services/embeddingService', () => ({ generateEmbedding: jest.fn() }));
jest.mock('../src/services/notificationService', () => ({ createNotification: jest.fn() }));
jest.mock('../src/services/pendingUploadService', () => ({
  verifyUploadReceipt: jest.fn(),
  cleanupPendingUploads: jest.fn(),
  consumePendingUploads: jest.fn(),
  queueAssetsForCleanup: jest.fn(),
  receiptsFromImageEntries: jest.fn(),
  receiptsFromLegacyArrays: jest.fn(),
}));

const prisma = require('../src/lib/prisma');
const itemRoutes = require('../src/routes/items');
const userRoutes = require('../src/routes/users');
const matchRoutes = require('../src/routes/matches');
const chatRoutes = require('../src/routes/chats');
const claimRoutes = require('../src/routes/claims');

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const ITEM_ID = '33333333-3333-4333-8333-333333333333';
const CLAIM_ID = '44444444-4444-4444-8444-444444444444';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/items', itemRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/chats', chatRoutes);
  app.use('/api/claims', claimRoutes);
  return app;
}

function publicListItem(overrides = {}) {
  return {
    id: ITEM_ID,
    type: 'LOST',
    status: 'ACTIVE',
    title: 'Black wallet',
    description: 'A black wallet with a small silver clasp.',
    category: 'Bags & Wallets',
    locationArea: 'Colombo 03',
    dateLostFound: new Date('2026-07-10T08:00:00.000Z'),
    isApproved: true,
    images: [],
    user: { id: USER_ID, name: 'Community member', avatarUrl: null },
    _count: { comments: 0 },
    ...overrides,
  };
}

describe('public item location privacy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.item.count.mockResolvedValue(1);
  });

  test('the public item feed selects no exact location fields and returns only the public area label', async () => {
    prisma.item.findMany.mockResolvedValue([publicListItem()]);

    const response = await request(createTestApp()).get('/api/items');

    expect(response.status).toBe(200);
    expect(response.body.items[0]).toEqual(expect.objectContaining({
      locationArea: 'Colombo 03',
      locationLabel: 'Colombo 03',
    }));
    expect(response.body.items[0]).not.toHaveProperty('locationLat');
    expect(response.body.items[0]).not.toHaveProperty('locationLng');

    const select = prisma.item.findMany.mock.calls[0][0].select;
    expect(prisma.item.findMany.mock.calls[0][0].where).toEqual(expect.objectContaining({
      user: { isBanned: false },
    }));
    expect(select).not.toHaveProperty('locationLabel');
    expect(select).not.toHaveProperty('locationLat');
    expect(select).not.toHaveProperty('locationLng');
  });

  test('public item search filters the shareable area rather than the private exact label', async () => {
    prisma.item.findMany.mockResolvedValue([]);
    prisma.item.count.mockResolvedValue(0);

    const response = await request(createTestApp()).get('/api/items?search=Flower%20Road');

    expect(response.status).toBe(200);
    const searchFields = prisma.item.findMany.mock.calls[0][0].where.OR;
    expect(searchFields).toContainEqual({
      locationArea: { contains: 'Flower Road', mode: 'insensitive' },
    });
    expect(searchFields).not.toContainEqual(expect.objectContaining({ locationLabel: expect.anything() }));
  });

  test('a public profile item list uses a generic label when no area was supplied', async () => {
    prisma.item.findMany.mockResolvedValue([publicListItem({ locationArea: null })]);

    const response = await request(createTestApp()).get(`/api/users/${USER_ID}/items`);

    expect(response.status).toBe(200);
    expect(response.body.items[0]).toEqual(expect.objectContaining({
      locationArea: null,
      locationLabel: 'Location shared privately',
    }));
    expect(response.body.items[0]).not.toHaveProperty('locationLat');
    expect(response.body.items[0]).not.toHaveProperty('locationLng');

    const select = prisma.item.findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty('locationLabel');
    expect(select).not.toHaveProperty('locationLat');
    expect(select).not.toHaveProperty('locationLng');
  });

  test('an unprivileged item detail always hides the exact label and coarsens coordinates', async () => {
    prisma.item.findUnique.mockResolvedValue({
      ...publicListItem({
        locationArea: null,
        locationLabel: 'Outside apartment 4B, 17 Flower Road',
        locationLat: 6.927079,
        locationLng: 79.861244,
        verificationHints: [],
        embedding: [0.1, 0.2],
        showContactInfo: false,
        userId: USER_ID,
      }),
      user: {
        id: USER_ID,
        name: 'Community member',
        avatarUrl: null,
        phone: '+94 77 123 4567',
        showPhone: true,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        _count: { items: 2 },
      },
      _count: { comments: 0, claims: 0 },
    });

    const response = await request(createTestApp()).get(`/api/items/${ITEM_ID}`);

    expect(response.status).toBe(200);
    expect(response.body.locationLabel).toBe('Location shared privately');
    expect(response.body.locationLat).toBe(6.93);
    expect(response.body.locationLng).toBe(79.86);
    expect(response.body.user.phone).toBeNull();
    expect(response.body).not.toHaveProperty('embedding');
    expect(response.body).not.toHaveProperty('verificationHints');
    expect(response.body._count).toEqual({ comments: 0 });
    expect(response.body._count).not.toHaveProperty('claims');

    const detailSelect = prisma.item.findUnique.mock.calls[0][0].select;
    expect(detailSelect._count.select.comments).toEqual({ where: { isHidden: false } });
    expect(detailSelect._count.select).not.toHaveProperty('claims');
    expect(detailSelect.user.select._count.select.items.where).toEqual({
      isApproved: true,
      deletedAt: null,
      status: { not: 'REJECTED' },
    });
  });

  test('an item owned by a banned user is not returned publicly', async () => {
    prisma.item.findUnique.mockResolvedValue({
      ...publicListItem({
        locationLabel: 'Private location',
        verificationHints: [],
        embedding: null,
        userId: USER_ID,
      }),
      user: {
        id: USER_ID,
        name: 'Banned member',
        avatarUrl: null,
        phone: null,
        showPhone: false,
        isBanned: true,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        _count: { items: 1 },
      },
      _count: { comments: 0, claims: 0 },
    });

    const response = await request(createTestApp()).get(`/api/items/${ITEM_ID}`);

    expect(response.status).toBe(404);
  });
});

describe('claimant contact privacy for item owners', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('the item-claims owner response does not select or return claimant email', async () => {
    prisma.item.findUnique.mockResolvedValue({ id: ITEM_ID, userId: OWNER_ID });
    prisma.claim.count.mockResolvedValue(1);
    prisma.claim.findMany.mockResolvedValue([{
      id: CLAIM_ID,
      claimant: {
        id: USER_ID,
        name: 'Claimant',
        avatarUrl: null,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    }]);

    const response = await request(createTestApp()).get(`/api/claims/item/${ITEM_ID}`);

    expect(response.status).toBe(200);
    expect(response.body.claims[0].claimant).not.toHaveProperty('email');
    expect(response.body).toEqual(expect.objectContaining({ total: 1, page: 1, hasNext: false }));
    const claimantSelect = prisma.claim.findMany.mock.calls[0][0].include.claimant.select;
    expect(claimantSelect).not.toHaveProperty('email');
  });

  test('the received-claims response does not select or return claimant email', async () => {
    prisma.claim.count.mockResolvedValue(1);
    prisma.claim.findMany.mockResolvedValue([{
      id: CLAIM_ID,
      claimant: {
        id: USER_ID,
        name: 'Claimant',
        avatarUrl: null,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
      },
      item: { id: ITEM_ID, title: 'Found wallet', images: [] },
    }]);

    const response = await request(createTestApp()).get('/api/claims/received');

    expect(response.status).toBe(200);
    expect(response.body.claims[0].claimant).not.toHaveProperty('email');
    const claimantSelect = prisma.claim.findMany.mock.calls[0][0].include.claimant.select;
    expect(claimantSelect).not.toHaveProperty('email');
  });
});

describe('UUID validation short-circuits before Prisma', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.each([
    ['public user profile', 'get', '/api/users/not-a-uuid'],
    ['public user items', 'get', '/api/users/not-a-uuid/items'],
    ['item matches', 'get', '/api/matches/not-a-uuid'],
    ['match refresh', 'post', '/api/matches/not-a-uuid/refresh'],
    ['chat detail', 'get', '/api/chats/not-a-uuid'],
    ['item claims', 'get', '/api/claims/item/not-a-uuid'],
    ['claim review', 'patch', '/api/claims/not-a-uuid'],
  ])('%s rejects a malformed path id', async (name, method, path) => {
    let call = request(createTestApp())[method](path);
    if (method === 'patch') call = call.send({ status: 'APPROVED' });

    const response = await call;

    expect(response.status).toBe(400);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.item.findUnique).not.toHaveBeenCalled();
    expect(prisma.claim.findUnique).not.toHaveBeenCalled();
    expect(prisma.claim.findMany).not.toHaveBeenCalled();
    expect(prisma.chat.findFirst).not.toHaveBeenCalled();
  });

  test.each([
    ['recipient id', { recipientId: 'not-a-uuid' }],
    ['optional item id', { recipientId: USER_ID, itemId: 'not-a-uuid' }],
  ])('chat creation rejects a malformed %s', async (name, payload) => {
    const response = await request(createTestApp())
      .post('/api/chats')
      .send(payload);

    expect(response.status).toBe(400);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.item.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('claim submission rejects a malformed item id body', async () => {
    const response = await request(createTestApp())
      .post('/api/claims')
      .send({
        itemId: 'not-a-uuid',
        verificationAnswers: { q0: 'A private identifying detail' },
      });

    expect(response.status).toBe(400);
    expect(prisma.item.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('item creation requires a public area independently of the private exact label', async () => {
    const response = await request(createTestApp())
      .post('/api/items')
      .send({
        type: 'LOST',
        title: 'Lost black wallet',
        description: 'A black leather wallet with a small silver clasp.',
        category: 'Bags & Wallets',
        locationLabel: 'Outside apartment 4B, 17 Flower Road',
        dateLostFound: '2026-07-10T08:00:00.000Z',
      });

    expect(response.status).toBe(400);
    expect(response.body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'locationArea' }),
    ]));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

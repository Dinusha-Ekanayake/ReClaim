const express = require('express');
const request = require('supertest');

jest.mock('../src/lib/prisma', () => ({
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  chat: {
    deleteMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  item: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  claim: {
    findUnique: jest.fn(),
    create: jest.fn(),
    groupBy: jest.fn(),
  },
}));

jest.mock('../src/middleware/auth', () => ({
  authenticate(req, res, next) {
    req.user = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Current member',
      role: 'USER',
    };
    next();
  },
}));

jest.mock('../src/services/cloudinaryService', () => ({
  upload: { single: jest.fn(() => (req, res, next) => next()) },
  uploadAvatar: jest.fn(),
  deleteFromCloudinary: jest.fn().mockResolvedValue(true),
}));
jest.mock('../src/controllers/authController', () => ({ clearAuthCookies: jest.fn() }));
jest.mock('../src/services/notificationService', () => ({ createNotification: jest.fn() }));
jest.mock('bcryptjs', () => ({ compare: jest.fn() }));

const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');
const { deleteFromCloudinary } = require('../src/services/cloudinaryService');
const authController = require('../src/controllers/authController');
const userRoutes = require('../src/routes/users');
const claimRoutes = require('../src/routes/claims');
const chatRoutes = require('../src/routes/chats');

const CURRENT_USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const ITEM_ID = '33333333-3333-4333-8333-333333333333';
const CHAT_IDS = [
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
];

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  app.use('/api/claims', claimRoutes);
  app.use('/api/chats', chatRoutes);
  return app;
}

describe('account-state lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((operation) => operation(prisma));
  });

  test('account deletion removes every participated chat before deleting the user', async () => {
    const passwordHash = '$2a$12$stored-password-hash';
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: CURRENT_USER_ID, password: passwordHash, role: 'USER' })
      .mockResolvedValueOnce({
        password: passwordHash,
        role: 'USER',
        avatarPublicId: 'avatars/member',
        items: [{ images: [{ publicId: 'items/photo-one' }] }],
        chatParticipants: [
          { chatId: CHAT_IDS[0] },
          { chatId: CHAT_IDS[1] },
          { chatId: CHAT_IDS[0] },
        ],
        claimsSubmitted: [],
      });
    prisma.$queryRaw.mockResolvedValue([{ id: CURRENT_USER_ID }]);
    prisma.chat.deleteMany.mockResolvedValue({ count: 2 });
    prisma.user.delete.mockResolvedValue({ id: CURRENT_USER_ID });
    bcrypt.compare.mockResolvedValue(true);

    const response = await request(createTestApp())
      .delete('/api/users/me')
      .send({ password: 'CurrentPassword1', confirmation: 'DELETE' });

    expect(response.status).toBe(204);
    expect(prisma.chat.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: CHAT_IDS } },
    });
    expect(prisma.chat.deleteMany.mock.invocationCallOrder[0])
      .toBeLessThan(prisma.user.delete.mock.invocationCallOrder[0]);
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: CURRENT_USER_ID } });
    expect(deleteFromCloudinary).toHaveBeenCalledTimes(2);
    expect(authController.clearAuthCookies).toHaveBeenCalled();
  });

  test('a wrong deletion-confirmation password does not invalidate the API session', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: CURRENT_USER_ID,
      password: '$2a$12$stored-password-hash',
      role: 'USER',
    });
    bcrypt.compare.mockResolvedValue(false);

    const response = await request(createTestApp())
      .delete('/api/users/me')
      .send({ password: 'WrongPassword1', confirmation: 'DELETE' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Password is incorrect');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(authController.clearAuthCookies).not.toHaveBeenCalled();
  });

  test('a banned account has no public profile', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const response = await request(createTestApp()).get(`/api/users/${OTHER_USER_ID}`);

    expect(response.status).toBe(404);
    expect(prisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: OTHER_USER_ID, isBanned: false },
    }));
  });

  test('a new claim cannot target a listing whose owner is banned', async () => {
    prisma.item.findFirst.mockResolvedValue(null);

    const response = await request(createTestApp())
      .post('/api/claims')
      .send({
        itemId: ITEM_ID,
        verificationAnswers: { q0: 'A private identifying detail' },
      });

    expect(response.status).toBe(404);
    expect(prisma.item.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: ITEM_ID, user: { isBanned: false } }),
    }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('claim submission rechecks owner state atomically before creating the claim', async () => {
    prisma.item.findFirst.mockResolvedValue({
      id: ITEM_ID,
      userId: OTHER_USER_ID,
      title: 'Found wallet',
      type: 'FOUND',
      status: 'ACTIVE',
      isApproved: true,
      verificationHints: ['question:What is engraved inside?'],
    });
    prisma.item.updateMany.mockResolvedValue({ count: 0 });

    const response = await request(createTestApp())
      .post('/api/claims')
      .send({
        itemId: ITEM_ID,
        verificationAnswers: { q0: 'A private identifying detail' },
      });

    expect(response.status).toBe(409);
    expect(prisma.item.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ user: { isBanned: false } }),
    }));
    expect(prisma.claim.create).not.toHaveBeenCalled();
  });

  test('a new chat cannot target a listing whose owner is banned', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: OTHER_USER_ID, isBanned: false });
    prisma.item.findFirst.mockResolvedValue(null);

    const response = await request(createTestApp())
      .post('/api/chats')
      .send({ recipientId: OTHER_USER_ID, itemId: ITEM_ID });

    expect(response.status).toBe(404);
    expect(prisma.item.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: ITEM_ID, deletedAt: null, user: { isBanned: false } }),
    }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('deleting the last pending claimant releases the listing from claim-pending state', async () => {
    const passwordHash = '$2a$12$stored-password-hash';
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: CURRENT_USER_ID, password: passwordHash, role: 'USER' })
      .mockResolvedValueOnce({
        password: passwordHash,
        role: 'USER',
        avatarPublicId: null,
        items: [],
        chatParticipants: [],
        claimsSubmitted: [{ itemId: ITEM_ID }],
      });
    prisma.$queryRaw.mockResolvedValue([{ id: CURRENT_USER_ID }]);
    prisma.user.delete.mockResolvedValue({ id: CURRENT_USER_ID });
    prisma.claim.groupBy.mockResolvedValue([]);
    prisma.item.updateMany.mockResolvedValue({ count: 1 });
    bcrypt.compare.mockResolvedValue(true);

    const response = await request(createTestApp())
      .delete('/api/users/me')
      .send({ password: 'CurrentPassword1', confirmation: 'DELETE' });

    expect(response.status).toBe(204);
    expect(prisma.claim.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: { itemId: { in: [ITEM_ID] }, status: 'PENDING' },
    }));
    expect(prisma.item.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: [ITEM_ID] },
        status: 'CLAIM_PENDING',
        deletedAt: null,
        claims: { none: { status: 'PENDING' } },
      },
      data: { status: 'ACTIVE' },
    });
  });

  test('chat creation rechecks listing availability after acquiring its transaction lock', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: OTHER_USER_ID, isBanned: false });
    prisma.item.findFirst
      .mockResolvedValueOnce({
        id: ITEM_ID,
        type: 'LOST',
        userId: CURRENT_USER_ID,
        isApproved: true,
        status: 'ACTIVE',
      })
      .mockResolvedValueOnce(null);
    prisma.claim.findUnique.mockResolvedValue({ id: '66666666-6666-4666-8666-666666666666' });
    prisma.$queryRaw.mockResolvedValue([{ pg_advisory_xact_lock: null }]);

    const response = await request(createTestApp())
      .post('/api/chats')
      .send({ recipientId: OTHER_USER_ID, itemId: ITEM_ID });

    expect(response.status).toBe(404);
    expect(prisma.item.findFirst).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({
        id: ITEM_ID,
        isApproved: true,
        user: { isBanned: false },
      }),
    }));
    expect(prisma.chat.create).not.toHaveBeenCalled();
  });
});

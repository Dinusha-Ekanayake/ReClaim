const express = require('express');
const request = require('supertest');

jest.mock('../src/lib/prisma', () => ({
  $transaction: jest.fn(),
  user: { findUnique: jest.fn(), update: jest.fn() },
  refreshToken: { deleteMany: jest.fn() },
  item: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  match: { deleteMany: jest.fn() },
  report: { update: jest.fn() },
}));
jest.mock('../src/middleware/auth', () => ({
  authenticate(req, res, next) {
    req.user = { id: 'admin-user', role: 'SUPER_ADMIN' };
    next();
  },
  requireAdmin(req, res, next) { next(); },
}));
jest.mock('../src/services/notificationService', () => ({
  createNotification: jest.fn(),
}));

const prisma = require('../src/lib/prisma');
const adminRoutes = require('../src/routes/admin');

const ID = '22222222-2222-4222-8222-222222222222';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  return app;
}

describe('admin lifecycle hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((operation) => operation(prisma));
  });

  test.each(['RETURNED', 'CLOSED'])('reapproval preserves an item in %s state', async (status) => {
    prisma.item.findUnique.mockResolvedValue({ id: ID, status, contentRevision: 1, deletedAt: null });
    prisma.item.updateMany.mockResolvedValue({ count: 1 });

    const response = await request(createTestApp())
      .patch(`/api/admin/items/${ID}/approve`)
      .send({ isApproved: true, contentRevision: 1 });

    expect(response.status).toBe(200);
    expect(prisma.item.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ contentRevision: 1, status }),
      data: expect.objectContaining({ isApproved: true, status }),
    }));
  });

  test('banning a user revokes all refresh sessions in the same transaction', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: ID, role: 'USER' });
    prisma.user.update.mockResolvedValue({ id: ID, name: 'Member', isBanned: true, banReason: 'Abuse' });
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });
    prisma.item.updateMany.mockResolvedValue({ count: 3 });
    prisma.match.deleteMany.mockResolvedValue({ count: 5 });

    const response = await request(createTestApp())
      .patch(`/api/admin/users/${ID}/ban`)
      .send({ isBanned: true, banReason: 'Abuse' });

    expect(response.status).toBe(200);
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: ID } });
    expect(prisma.item.updateMany).toHaveBeenCalledWith({
      where: {
        userId: ID,
        isApproved: true,
        status: { in: ['ACTIVE', 'MATCHED', 'CLAIM_PENDING'] },
      },
      data: expect.objectContaining({
        isApproved: false,
        matchingPending: false,
      }),
    });
    expect(prisma.match.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { lostItem: { userId: ID } },
          { foundItem: { userId: ID } },
        ],
      },
    });
    expect(response.body).toEqual(expect.objectContaining({
      isBanned: true,
      quarantinedItems: 3,
      removedMatches: 5,
    }));
  });

  test('unbanning does not silently reapprove quarantined listings', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: ID, role: 'USER' });
    prisma.user.update.mockResolvedValue({ id: ID, name: 'Member', isBanned: false, banReason: null });

    const response = await request(createTestApp())
      .patch(`/api/admin/users/${ID}/ban`)
      .send({ isBanned: false });

    expect(response.status).toBe(200);
    expect(prisma.item.updateMany).not.toHaveBeenCalled();
    expect(prisma.match.deleteMany).not.toHaveBeenCalled();
  });

  test('reviewing a report does not claim it has been resolved', async () => {
    prisma.report.update.mockImplementation(({ data }) => Promise.resolve({ id: ID, ...data }));

    const response = await request(createTestApp())
      .patch(`/api/admin/reports/${ID}`)
      .send({ status: 'REVIEWED' });

    expect(response.status).toBe(200);
    expect(prisma.report.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'REVIEWED', resolvedAt: null, resolvedBy: null }),
    }));
  });
});

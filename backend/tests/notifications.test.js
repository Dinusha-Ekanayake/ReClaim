const express = require('express');
const request = require('supertest');

jest.mock('../src/lib/prisma', () => ({
  notification: {
    updateMany: jest.fn(),
  },
}));
jest.mock('../src/middleware/auth', () => ({
  authenticate(req, res, next) {
    req.user = { id: 'current-user' };
    next();
  },
}));

const prisma = require('../src/lib/prisma');
const notificationRoutes = require('../src/routes/notifications');

const NOTIFICATION_ID = '11111111-1111-4111-8111-111111111111';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/notifications', notificationRoutes);
  return app;
}

describe('notification read endpoint', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns success after updating an owned notification', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });

    const response = await request(createTestApp())
      .patch(`/api/notifications/${NOTIFICATION_ID}/read`);

    expect(response.status).toBe(200);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: NOTIFICATION_ID, userId: 'current-user' },
      data: { isRead: true },
    });
  });

  test('does not reveal notifications outside the current account', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });

    const response = await request(createTestApp())
      .patch(`/api/notifications/${NOTIFICATION_ID}/read`);

    expect(response.status).toBe(404);
  });

  test('rejects malformed notification ids before querying', async () => {
    const response = await request(createTestApp())
      .patch('/api/notifications/not-a-uuid/read');

    expect(response.status).toBe(400);
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
  });
});

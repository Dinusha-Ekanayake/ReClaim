const express = require('express');
const request = require('supertest');

jest.mock('../src/lib/prisma', () => ({
  user: { count: jest.fn() },
  item: { groupBy: jest.fn(), count: jest.fn() },
}));

const prisma = require('../src/lib/prisma');
const statsRoutes = require('../src/routes/stats');

function createTestApp() {
  const app = express();
  app.use('/api/stats', statsRoutes);
  return app;
}

describe('public stats cache', () => {
  test('coalesces repeated reads into one short-lived aggregate snapshot', async () => {
    prisma.user.count.mockResolvedValueOnce(10).mockResolvedValueOnce(2);
    prisma.item.groupBy
      .mockResolvedValueOnce([{ type: 'LOST', _count: { _all: 4 } }, { type: 'FOUND', _count: { _all: 6 } }])
      .mockResolvedValueOnce([{ status: 'ACTIVE', _count: { _all: 7 } }, { status: 'RETURNED', _count: { _all: 3 } }]);
    prisma.item.count.mockResolvedValue(3);

    const app = createTestApp();
    const first = await request(app).get('/api/stats');
    const second = await request(app).get('/api/stats');

    expect(first.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(first.headers['cache-control']).toContain('stale-while-revalidate');
    expect(prisma.user.count).toHaveBeenCalledTimes(2);
    expect(prisma.item.groupBy).toHaveBeenCalledTimes(2);
    expect(prisma.item.count).toHaveBeenCalledTimes(1);
    expect(prisma.user.count).toHaveBeenNthCalledWith(1, {
      where: { role: 'USER', isBanned: false },
    });
    expect(prisma.item.groupBy.mock.calls[0][0].where).toEqual(expect.objectContaining({
      user: { isBanned: false },
    }));
  });
});

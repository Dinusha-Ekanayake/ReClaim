jest.mock('../src/lib/prisma', () => ({
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
  item: { findUnique: jest.fn(), findMany: jest.fn() },
  match: {
    upsert: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  notification: { create: jest.fn() },
}));
jest.mock('../src/services/notificationService', () => ({ emitNotification: jest.fn() }));

const prisma = require('../src/lib/prisma');
const { emitNotification } = require('../src/services/notificationService');
const { computeMatches } = require('../src/services/matchingService');

const claimedAt = new Date('2026-07-13T12:00:00.000Z');
const lost = {
  id: '11111111-1111-4111-8111-111111111111',
  type: 'LOST',
  status: 'ACTIVE',
  isApproved: true,
  deletedAt: null,
  contentRevision: 1,
  matchingPending: true,
  matchingLockedAt: claimedAt,
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  user: { isBanned: false },
  title: 'Black leather wallet',
  description: 'Wallet with a silver zipper and university card',
  category: 'Bags & Wallets',
  brand: null,
  color: 'Black',
  locationLat: 6.9271,
  locationLng: 79.8612,
  locationLabel: 'Colombo Fort',
  dateLostFound: new Date('2026-07-10T12:00:00.000Z'),
  embedding: null,
};
const found = {
  ...lost,
  id: '22222222-2222-4222-8222-222222222222',
  type: 'FOUND',
  userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  title: 'Found black leather wallet',
};

function mockStableItems(items = [lost, found]) {
  const byId = new Map(items.map(item => [item.id, item]));
  prisma.item.findUnique.mockImplementation(({ where }) => Promise.resolve(byId.get(where.id) || null));
  prisma.item.findMany.mockImplementation(({ where }) => {
    if (where.id?.in) {
      return Promise.resolve(where.id.in.map(id => byId.get(id)).filter(Boolean));
    }
    return Promise.resolve(items.filter(item => item.type === where.type));
  });
}

describe('durable match persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    prisma.match.upsert.mockResolvedValue({ id: 'pair' });
    prisma.match.updateMany.mockResolvedValue({ count: 0 });
    prisma.match.deleteMany.mockResolvedValue({ count: 0 });
    prisma.match.findMany.mockResolvedValue([]);
    prisma.notification.create.mockImplementation(({ data }) => Promise.resolve({ id: 'notification', ...data }));
  });

  test('a missing source cannot create or notify matches and stale rows are removed', async () => {
    prisma.item.findUnique.mockResolvedValue(null);

    await expect(computeMatches(lost.id)).resolves.toEqual([]);

    expect(prisma.item.findMany).not.toHaveBeenCalled();
    expect(prisma.match.upsert).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(prisma.match.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ lostItemId: lost.id }, { foundItemId: lost.id }] },
    });
  });

  test.each([
    ['lost then found', [lost.id, found.id]],
    ['found then lost', [found.id, lost.id]],
  ])('keeps independent per-side ranks when processed %s', async (_label, order) => {
    mockStableItems();

    for (const itemId of order) await computeMatches(itemId);

    const updates = prisma.match.upsert.mock.calls.map(([call]) => call.update);
    expect(updates).toEqual(expect.arrayContaining([
      expect.objectContaining({ lostRank: 1 }),
      expect.objectContaining({ foundRank: 1 }),
    ]));
    expect(prisma.match.updateMany.mock.calls.map(([call]) => call.data)).toEqual(expect.arrayContaining([
      { lostRank: null },
      { foundRank: null },
    ]));
    expect(prisma.match.deleteMany).toHaveBeenNthCalledWith(1, {
      where: {
        lostRank: null,
        foundRank: null,
        OR: [{ lostItemId: order[0] }, { foundItemId: order[0] }],
      },
    });
    expect(prisma.match.deleteMany).toHaveBeenNthCalledWith(2, {
      where: {
        lostRank: null,
        foundRank: null,
        OR: [{ lostItemId: order[1] }, { foundItemId: order[1] }],
      },
    });
  });

  test('a superseded worker claim performs no scoring or persistence', async () => {
    prisma.item.findUnique.mockResolvedValue({
      ...lost,
      contentRevision: 2,
      matchingLockedAt: new Date('2026-07-13T12:01:00.000Z'),
    });

    await expect(computeMatches(lost.id, {
      expectedContentRevision: 1,
      expectedMatchingLockedAt: claimedAt,
    })).resolves.toEqual([]);

    expect(prisma.item.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.match.upsert).not.toHaveBeenCalled();
    expect(prisma.match.deleteMany).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  test('a source edit during scoring cannot overwrite a newer revision', async () => {
    prisma.item.findUnique.mockResolvedValue(lost);
    prisma.item.findMany.mockImplementation(({ where }) => {
      if (where.id?.in) return Promise.resolve([{ ...lost, contentRevision: 2 }, found]);
      return Promise.resolve([found]);
    });

    await expect(computeMatches(lost.id, {
      expectedContentRevision: 1,
      expectedMatchingLockedAt: claimedAt,
    })).resolves.toEqual([]);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prisma.match.upsert).not.toHaveBeenCalled();
    expect(prisma.match.updateMany).not.toHaveBeenCalled();
    expect(prisma.match.deleteMany).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  test('a counterpart edit during scoring is excluded and its stale source rank is released', async () => {
    prisma.item.findUnique.mockResolvedValue(lost);
    prisma.item.findMany.mockImplementation(({ where }) => {
      if (where.id?.in) return Promise.resolve([lost, { ...found, contentRevision: 2 }]);
      return Promise.resolve([found]);
    });

    await expect(computeMatches(lost.id, {
      expectedContentRevision: 1,
      expectedMatchingLockedAt: claimedAt,
    })).resolves.toEqual([]);

    expect(prisma.match.upsert).not.toHaveBeenCalled();
    expect(prisma.match.updateMany).toHaveBeenCalledWith({
      where: { lostItemId: lost.id },
      data: { lostRank: null },
    });
    expect(prisma.match.deleteMany).toHaveBeenCalledWith({
      where: {
        lostRank: null,
        foundRank: null,
        OR: [{ lostItemId: lost.id }, { foundItemId: lost.id }],
      },
    });
    expect(prisma.match.findMany).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  test('rank persistence and high-confidence notifications use one guarded transaction', async () => {
    mockStableItems();
    prisma.match.findMany.mockResolvedValue([{
      id: 'pair',
      lostItemId: lost.id,
      foundItemId: found.id,
      score: 82,
      lostItem: { userId: lost.userId, title: lost.title },
      foundItem: { userId: found.userId, title: found.title },
    }]);
    prisma.match.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });

    await expect(computeMatches(lost.id)).resolves.toHaveLength(1);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(emitNotification).toHaveBeenCalledTimes(2);
  });
});

jest.mock('../src/lib/prisma', () => ({
  $transaction: jest.fn(),
  item: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  match: { deleteMany: jest.fn() },
}));
jest.mock('../src/services/embeddingService', () => ({ generateEmbedding: jest.fn() }));
jest.mock('../src/services/matchingService', () => ({
  computeMatches: jest.fn(),
  MATCHABLE_ITEM_STATUSES: ['ACTIVE', 'MATCHED', 'CLAIM_PENDING'],
}));

const prisma = require('../src/lib/prisma');
const { generateEmbedding } = require('../src/services/embeddingService');
const { computeMatches } = require('../src/services/matchingService');
const { runMatchingBatch } = require('../src/services/matchingWorker');

describe('matching worker persistence guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateEmbedding.mockResolvedValue(null);
    computeMatches.mockResolvedValue([]);
  });

  test('passes the claimed lock and exact content revision into matching', async () => {
    const itemId = '11111111-1111-4111-8111-111111111111';
    let claimedAt;
    prisma.item.findMany.mockResolvedValue([{ id: itemId, matchingAttempts: 0 }]);
    prisma.item.updateMany.mockImplementation(({ data }) => {
      if (data.matchingLockedAt instanceof Date) claimedAt = data.matchingLockedAt;
      return Promise.resolve({ count: 1 });
    });
    prisma.item.findUnique.mockImplementation(() => Promise.resolve({
      id: itemId,
      title: 'Wallet',
      description: 'Black leather wallet',
      category: 'Bags & Wallets',
      brand: null,
      color: 'Black',
      status: 'ACTIVE',
      isApproved: true,
      deletedAt: null,
      contentRevision: 7,
      matchingPending: true,
      matchingLockedAt: claimedAt,
      user: { isBanned: false },
    }));

    await runMatchingBatch();

    expect(computeMatches).toHaveBeenCalledWith(itemId, {
      expectedContentRevision: 7,
      expectedMatchingLockedAt: claimedAt,
    });
  });
});

const { reviewClaim } = require('../src/services/claimReviewService');

const ITEM_ID = '11111111-1111-4111-8111-111111111111';
const CLAIM_A = '22222222-2222-4222-8222-222222222222';
const CLAIM_B = '33333333-3333-4333-8333-333333333333';
const OWNER_ID = '44444444-4444-4444-8444-444444444444';

function makeClaim(id, claimantId) {
  return {
    id,
    itemId: ITEM_ID,
    claimantId,
    status: 'PENDING',
    verificationAnswers: {},
    message: null,
    adminNote: null,
    reviewedAt: null,
    reviewedBy: null,
  };
}

function matchesWhere(record, where) {
  if (where.id && typeof where.id === 'string' && record.id !== where.id) return false;
  if (where.id?.not && record.id === where.id.not) return false;
  if (where.itemId && record.itemId !== where.itemId) return false;
  if (where.status && record.status !== where.status) return false;
  return true;
}

function createTransactionalHarness({ failNotification = false } = {}) {
  let state = {
    item: {
      id: ITEM_ID,
      title: 'Recovered backpack',
      userId: OWNER_ID,
      status: 'CLAIM_PENDING',
      deletedAt: null,
      matchingPending: true,
      matchingLockedAt: new Date(),
      matchingRetryAt: new Date(),
    },
    claims: {
      [CLAIM_A]: makeClaim(CLAIM_A, '55555555-5555-4555-8555-555555555555'),
      [CLAIM_B]: makeClaim(CLAIM_B, '66666666-6666-4666-8666-666666666666'),
    },
    matches: [{ id: 'match-1' }],
    notifications: [],
  };

  let transactionTail = Promise.resolve();
  let shouldFailNotification = failNotification;

  const client = {
    $transaction: jest.fn((operation) => {
      const waitForPrevious = transactionTail;
      let release;
      transactionTail = new Promise((resolve) => { release = resolve; });

      return (async () => {
        await waitForPrevious;
        const working = structuredClone(state);
        const tx = {
          $queryRaw: jest.fn((query) => {
            const claimId = query.values[0];
            return Promise.resolve(working.claims[claimId] ? [{ itemId: ITEM_ID }] : []);
          }),
          claim: {
            findUnique: jest.fn(({ where, include }) => {
              const claim = working.claims[where.id];
              if (!claim) return Promise.resolve(null);
              return Promise.resolve(structuredClone(include
                ? { ...claim, item: working.item }
                : claim));
            }),
            findFirst: jest.fn(({ where }) => Promise.resolve(
              structuredClone(Object.values(working.claims).find((claim) => matchesWhere(claim, where)) || null)
            )),
            findMany: jest.fn(({ where }) => Promise.resolve(
              structuredClone(Object.values(working.claims).filter((claim) => matchesWhere(claim, where)))
            )),
            updateMany: jest.fn(({ where, data }) => {
              const records = Object.values(working.claims).filter((claim) => matchesWhere(claim, where));
              records.forEach((claim) => Object.assign(claim, structuredClone(data)));
              return Promise.resolve({ count: records.length });
            }),
            count: jest.fn(({ where }) => Promise.resolve(
              Object.values(working.claims).filter((claim) => matchesWhere(claim, where)).length
            )),
          },
          item: {
            update: jest.fn(({ data }) => {
              Object.assign(working.item, structuredClone(data));
              return Promise.resolve(structuredClone(working.item));
            }),
          },
          match: {
            deleteMany: jest.fn(() => {
              const count = working.matches.length;
              working.matches = [];
              return Promise.resolve({ count });
            }),
          },
          notification: {
            create: jest.fn(({ data }) => {
              if (shouldFailNotification) {
                shouldFailNotification = false;
                return Promise.reject(new Error('notification insert failed'));
              }
              const notification = { id: `notification-${working.notifications.length + 1}`, ...data };
              working.notifications.push(notification);
              return Promise.resolve(structuredClone(notification));
            }),
          },
        };

        try {
          const result = await operation(tx);
          state = working;
          return result;
        } finally {
          release();
        }
      })();
    }),
  };

  return { client, getState: () => structuredClone(state) };
}

function ownerReview(client, claimId, status) {
  return reviewClaim({
    claimId,
    status,
    reviewerId: OWNER_ID,
    reviewerRole: 'USER',
    prismaClient: client,
  });
}

describe('claim review transaction invariants', () => {
  test('concurrent approvals produce exactly one approved claim and one returned item', async () => {
    const harness = createTransactionalHarness();

    const results = await Promise.allSettled([
      ownerReview(harness.client, CLAIM_A, 'APPROVED'),
      ownerReview(harness.client, CLAIM_B, 'APPROVED'),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(({ status }) => status === 'rejected');
    expect(rejected.reason).toEqual(expect.objectContaining({ status: 409 }));

    const state = harness.getState();
    expect(Object.values(state.claims).filter((claim) => claim.status === 'APPROVED')).toHaveLength(1);
    expect(Object.values(state.claims).filter((claim) => claim.status === 'REJECTED')).toHaveLength(1);
    expect(state.item).toEqual(expect.objectContaining({
      status: 'RETURNED',
      matchingPending: false,
      matchingLockedAt: null,
      matchingRetryAt: null,
    }));
    expect(state.matches).toHaveLength(0);
    expect(state.notifications).toHaveLength(2);
  });

  test('a concurrent reject cannot overwrite the lifecycle produced by an approval', async () => {
    const harness = createTransactionalHarness();

    const results = await Promise.all([
      ownerReview(harness.client, CLAIM_A, 'REJECTED'),
      ownerReview(harness.client, CLAIM_B, 'APPROVED'),
    ]);

    expect(results).toHaveLength(2);
    const state = harness.getState();
    expect(state.claims[CLAIM_A].status).toBe('REJECTED');
    expect(state.claims[CLAIM_B].status).toBe('APPROVED');
    expect(state.item.status).toBe('RETURNED');
    expect(state.matches).toHaveLength(0);
  });

  test('a notification insert failure rolls the review back with the transaction', async () => {
    const harness = createTransactionalHarness({ failNotification: true });

    await expect(ownerReview(harness.client, CLAIM_A, 'REJECTED'))
      .rejects.toThrow('notification insert failed');

    const state = harness.getState();
    expect(state.claims[CLAIM_A].status).toBe('PENDING');
    expect(state.item.status).toBe('CLAIM_PENDING');
    expect(state.notifications).toHaveLength(0);
  });
});

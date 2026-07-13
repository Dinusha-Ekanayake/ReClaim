const prisma = require('../lib/prisma');
const { generateEmbedding } = require('./embeddingService');
const { computeMatches, MATCHABLE_ITEM_STATUSES } = require('./matchingService');

const LOCK_TIMEOUT_MS = 10 * 60 * 1000;
const BASE_RETRY_MS = 30 * 1000;
const MAX_RETRY_MS = 6 * 60 * 60 * 1000;

let interval;
let runningBatch = null;

function integerSetting(name, fallback, min, max) {
  const parsed = Number.parseInt(process.env[name] || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function retryDelay(attempt) {
  return Math.min(MAX_RETRY_MS, BASE_RETRY_MS * (2 ** Math.min(Math.max(attempt - 1, 0), 10)));
}

function errorSummary(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, ' ').slice(0, 1000);
}

async function deferJob(itemId, claimedAt, previousAttempts, error) {
  const attempts = previousAttempts + 1;
  await prisma.item.updateMany({
    where: { id: itemId, matchingPending: true, matchingLockedAt: claimedAt },
    data: {
      matchingLockedAt: null,
      matchingRetryAt: new Date(Date.now() + retryDelay(attempts)),
      matchingAttempts: attempts,
      matchingLastError: errorSummary(error),
    },
  });
}

async function completeJob(itemId, claimedAt) {
  await prisma.item.updateMany({
    where: { id: itemId, matchingPending: true, matchingLockedAt: claimedAt },
    data: {
      matchingPending: false,
      matchingLockedAt: null,
      matchingRetryAt: null,
      matchingAttempts: 0,
      matchingLastError: null,
    },
  });
}

async function processClaimedItem(itemId, claimedAt, previousAttempts) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      brand: true,
      color: true,
      status: true,
      isApproved: true,
      deletedAt: true,
      contentRevision: true,
      matchingPending: true,
      matchingLockedAt: true,
      user: { select: { isBanned: true } },
    },
  });

  if (!item) return;
  if (
    !item.matchingPending
    || item.matchingLockedAt?.getTime() !== claimedAt.getTime()
  ) return;

  if (
    item.deletedAt
    || !item.isApproved
    || item.user.isBanned
    || !MATCHABLE_ITEM_STATUSES.includes(item.status)
  ) {
    await prisma.$transaction([
      prisma.match.deleteMany({
        where: { OR: [{ lostItemId: itemId }, { foundItemId: itemId }] },
      }),
      prisma.item.updateMany({
        where: { id: itemId, matchingPending: true, matchingLockedAt: claimedAt },
        data: {
          matchingPending: false,
          matchingLockedAt: null,
          matchingRetryAt: null,
          matchingAttempts: 0,
          matchingLastError: null,
        },
      }),
    ]);
    return;
  }

  let embeddingError = null;
  try {
    const embedding = await generateEmbedding(
      `${item.title} ${item.description} ${item.category} ${item.brand || ''} ${item.color || ''}`,
    );
    if (Array.isArray(embedding) && embedding.length > 0) {
      const stillClaimed = await prisma.item.updateMany({
        where: {
          id: itemId,
          contentRevision: item.contentRevision,
          matchingPending: true,
          matchingLockedAt: claimedAt,
        },
        data: { embedding },
      });
      // An edit or moderation action superseded this job. Its newly queued job
      // owns the latest data and will perform the matching pass.
      if (stillClaimed.count !== 1) return;
    }
  } catch (error) {
    // Embeddings are an enhancement. Always run deterministic matching even
    // when the external provider is temporarily unavailable.
    embeddingError = error;
  }

  try {
    await computeMatches(itemId, {
      expectedContentRevision: item.contentRevision,
      expectedMatchingLockedAt: claimedAt,
    });
    if (embeddingError) {
      await deferJob(itemId, claimedAt, previousAttempts, embeddingError);
    } else {
      await completeJob(itemId, claimedAt);
    }
  } catch (error) {
    await deferJob(itemId, claimedAt, previousAttempts, error);
  }
}

async function runMatchingBatch() {
  if (runningBatch) return runningBatch;

  runningBatch = (async () => {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - LOCK_TIMEOUT_MS);
    const batchSize = integerSetting('MATCHING_WORKER_BATCH_SIZE', 10, 1, 50);
    const jobs = await prisma.item.findMany({
      where: {
        matchingPending: true,
        isApproved: true,
        deletedAt: null,
        status: { in: MATCHABLE_ITEM_STATUSES },
        user: { isBanned: false },
        AND: [
          { OR: [{ matchingRetryAt: null }, { matchingRetryAt: { lte: now } }] },
          { OR: [{ matchingLockedAt: null }, { matchingLockedAt: { lt: staleBefore } }] },
        ],
      },
      select: { id: true, matchingAttempts: true },
      orderBy: [{ matchingRetryAt: 'asc' }, { createdAt: 'asc' }],
      take: batchSize,
    });

    await Promise.all(jobs.map(async (job) => {
      const claimedAt = new Date();
      const claimed = await prisma.item.updateMany({
        where: {
          id: job.id,
          matchingPending: true,
          isApproved: true,
          deletedAt: null,
          status: { in: MATCHABLE_ITEM_STATUSES },
          user: { isBanned: false },
          AND: [
            { OR: [{ matchingRetryAt: null }, { matchingRetryAt: { lte: now } }] },
            { OR: [{ matchingLockedAt: null }, { matchingLockedAt: { lt: staleBefore } }] },
          ],
        },
        data: { matchingLockedAt: claimedAt },
      });
      if (claimed.count === 1) {
        await processClaimedItem(job.id, claimedAt, job.matchingAttempts);
      }
    }));
  })().finally(() => {
    runningBatch = null;
  });

  return runningBatch;
}

function startMatchingWorker() {
  if (interval) return;
  const intervalMs = integerSetting('MATCHING_WORKER_INTERVAL_MS', 15_000, 5_000, 300_000);

  void runMatchingBatch().catch(error => console.error('Matching worker failed:', error));
  interval = setInterval(() => {
    void runMatchingBatch().catch(error => console.error('Matching worker failed:', error));
  }, intervalMs);
  interval.unref?.();
}

async function stopMatchingWorker() {
  if (interval) clearInterval(interval);
  interval = null;
  if (runningBatch) await runningBatch;
}

module.exports = {
  runMatchingBatch,
  startMatchingWorker,
  stopMatchingWorker,
  retryDelay,
};

const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');
const { emitNotification } = require('./notificationService');
const { publicItemSelect, publicUserSelect, primaryImageSelect } = require('../utils/selects');

const MATCHABLE_ITEM_STATUSES = ['ACTIVE', 'MATCHED', 'CLAIM_PENDING'];

const matchingItemSelect = {
  id: true, type: true, status: true, userId: true, title: true, description: true,
  category: true, brand: true, color: true, locationLat: true, locationLng: true,
  locationLabel: true, dateLostFound: true, embedding: true, isApproved: true,
  contentRevision: true, deletedAt: true,
};

const guardedMatchingItemSelect = {
  ...matchingItemSelect,
  matchingPending: true,
  matchingLockedAt: true,
  user: { select: { isBanned: true } },
};

function sameInstant(left, right) {
  if (!(left instanceof Date) || !(right instanceof Date)) return false;
  return left.getTime() === right.getTime();
}

function isMatchableItem(item) {
  return Boolean(
    item
    && item.isApproved
    && item.deletedAt === null
    && MATCHABLE_ITEM_STATUSES.includes(item.status)
    && item.user?.isBanned === false,
  );
}

function workerClaimMatches(item, expectedMatchingLockedAt) {
  if (expectedMatchingLockedAt === undefined) return true;
  return Boolean(
    item?.matchingPending
    && sameInstant(item.matchingLockedAt, expectedMatchingLockedAt),
  );
}

async function lockMatchingRows(tx, userIds, itemIds) {
  // Moderation locks User before Item, so matching follows the same order. A
  // SHARE lock blocks bans/deletes but remains compatible with the KEY SHARE
  // locks taken by unrelated notification foreign-key inserts.
  if (userIds.length) {
    await tx.$queryRaw(Prisma.sql`
      SELECT "id"
      FROM "User"
      WHERE "id" IN (${Prisma.join(userIds)})
      ORDER BY "id"
      FOR SHARE
    `);
  }
  if (itemIds.length) {
    await tx.$queryRaw(Prisma.sql`
      SELECT "id"
      FROM "Item"
      WHERE "id" IN (${Prisma.join(itemIds)})
      ORDER BY "id"
      FOR UPDATE
    `);
  }
}

// ─── Keyword Overlap Score (0-1) ──────────────────────────────────────────────
function keywordScore(textA, textB) {
  const tokenize = (value) => {
    const normalized = String(value ?? '').normalize('NFKC').toLocaleLowerCase();
    // Preserve letters, combining marks, and numbers from every script. The
    // previous ASCII-only expression erased Sinhala and Tamil text entirely.
    return normalized.match(/[\p{L}\p{M}\p{N}]+/gu)?.filter(token => [...token].length > 2) || [];
  };
  const wordsA = new Set(tokenize(textA));
  const wordsB = new Set(tokenize(textB));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

// ─── Date Proximity Score (0-1) ───────────────────────────────────────────────
function dateScore(dateA, dateB) {
  const diffDays = Math.abs((new Date(dateA) - new Date(dateB)) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 1;
  if (diffDays <= 1) return 0.9;
  if (diffDays <= 3) return 0.7;
  if (diffDays <= 7) return 0.5;
  if (diffDays <= 14) return 0.3;
  if (diffDays <= 30) return 0.1;
  return 0;
}

// ─── Location Score (0-1) ─────────────────────────────────────────────────────
function locationScore(latA, lngA, latB, lngB, labelA, labelB) {
  // If no coords, fall back to label similarity
  if (![latA, lngA, latB, lngB].every(Number.isFinite)) {
    return keywordScore(labelA || '', labelB || '') * 0.5;
  }
  // Haversine distance in km
  const R = 6371;
  const dLat = ((latB - latA) * Math.PI) / 180;
  const dLng = ((lngB - lngA) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((latA * Math.PI) / 180) * Math.cos((latB * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (km <= 0.5) return 1;
  if (km <= 1) return 0.9;
  if (km <= 3) return 0.7;
  if (km <= 5) return 0.5;
  if (km <= 10) return 0.3;
  if (km <= 25) return 0.1;
  return 0;
}

// ─── Cosine Similarity for embeddings ────────────────────────────────────────
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] ** 2;
    magB += vecB[i] ** 2;
  }
  return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

// ─── Compute Match Score ──────────────────────────────────────────────────────
function computeScore(lostItem, foundItem) {
  const weights = {
    category: 25,
    keywords: 25,
    location: 20,
    date: 15,
    attributes: 10, // color + brand
    embedding: 5,
  };

  const scores = {
    category: lostItem.category === foundItem.category ? 1 : 0,
    keywords: keywordScore(
      `${lostItem.title} ${lostItem.description}`,
      `${foundItem.title} ${foundItem.description}`
    ),
    location: locationScore(
      lostItem.locationLat, lostItem.locationLng,
      foundItem.locationLat, foundItem.locationLng,
      lostItem.locationLabel, foundItem.locationLabel
    ),
    date: dateScore(lostItem.dateLostFound, foundItem.dateLostFound),
    attributes: (() => {
      let s = 0, count = 0;
      if (lostItem.color && foundItem.color) {
        s += lostItem.color.toLowerCase() === foundItem.color.toLowerCase() ? 1 : 0;
        count++;
      }
      if (lostItem.brand && foundItem.brand) {
        s += lostItem.brand.toLowerCase() === foundItem.brand.toLowerCase() ? 1 : 0;
        count++;
      }
      return count > 0 ? s / count : 0;
    })(),
    embedding: cosineSimilarity(lostItem.embedding, foundItem.embedding),
  };

  const totalScore = Object.entries(weights).reduce(
    (acc, [key, weight]) => acc + scores[key] * weight, 0
  );

  const breakdown = Object.fromEntries(
    Object.entries(scores).map(([k, v]) => [k, Math.round(v * weights[k] * 10) / 10])
  );

  return { score: Math.round(totalScore * 10) / 10, breakdown };
}

// ─── Main: Compute and Store Matches for an Item ──────────────────────────────
async function clearMatchesIfStillIneligible(item, expectedContentRevision, expectedMatchingLockedAt) {
  return prisma.$transaction(async (tx) => {
    await lockMatchingRows(tx, [item.userId].sort(), [item.id].sort());
    const current = await tx.item.findUnique({
      where: { id: item.id },
      select: guardedMatchingItemSelect,
    });

    if (
      current
      && (
        current.contentRevision !== expectedContentRevision
        || !workerClaimMatches(current, expectedMatchingLockedAt)
        || isMatchableItem(current)
      )
    ) return false;

    await tx.match.deleteMany({
      where: { OR: [{ lostItemId: item.id }, { foundItemId: item.id }] },
    });
    return true;
  }, { maxWait: 5_000, timeout: 15_000 });
}

async function computeMatches(itemId, options = {}) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: guardedMatchingItemSelect,
  });
  if (!item) {
    // A hard-deleted Item cannot be recreated with the same id through the
    // application. Foreign keys normally cascade these rows; this also repairs
    // databases upgraded from older schemas.
    await prisma.match.deleteMany({
      where: { OR: [{ lostItemId: itemId }, { foundItemId: itemId }] },
    });
    return [];
  }

  const expectedContentRevision = options.expectedContentRevision ?? item.contentRevision;
  const expectedMatchingLockedAt = options.expectedMatchingLockedAt;

  // An edit may supersede a claimed worker before it even starts scoring. The
  // newer job owns match persistence, so the stale worker must perform no write.
  if (
    item.contentRevision !== expectedContentRevision
    || !workerClaimMatches(item, expectedMatchingLockedAt)
  ) return [];

  if (!isMatchableItem(item)) {
    await clearMatchesIfStillIneligible(item, expectedContentRevision, expectedMatchingLockedAt);
    return [];
  }

  const MIN_SCORE = 30;
  const counterType = item.type === 'LOST' ? 'FOUND' : 'LOST';
  const candidates = await prisma.item.findMany({
    where: {
      type: counterType,
      status: { in: MATCHABLE_ITEM_STATUSES },
      isApproved: true,
      deletedAt: null,
      userId: { not: item.userId },
      user: { isBanned: false },
      category: item.category,
    },
    select: matchingItemSelect,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 500,
  });

  const matches = [];
  for (const candidate of candidates) {
    const lostItem = item.type === 'LOST' ? item : candidate;
    const foundItem = item.type === 'FOUND' ? item : candidate;
    const { score, breakdown } = computeScore(lostItem, foundItem);
    if (score >= MIN_SCORE) {
      matches.push({ lostItemId: lostItem.id, foundItemId: foundItem.id, score, breakdown });
    }
  }

  const top = matches
    .sort((a, b) => b.score - a.score
      || a.lostItemId.localeCompare(b.lostItemId)
      || a.foundItemId.localeCompare(b.foundItemId))
    .slice(0, 20);
  const rankField = item.type === 'LOST' ? 'lostRank' : 'foundRank';
  const counterpartField = item.type === 'LOST' ? 'foundItemId' : 'lostItemId';
  const sourceField = item.type === 'LOST' ? 'lostItemId' : 'foundItemId';
  const candidateSnapshots = new Map(candidates.map(candidate => [candidate.id, candidate]));
  const topCounterpartIds = top.map(match => match[counterpartField]);
  const topUserIds = topCounterpartIds
    .map(id => candidateSnapshots.get(id)?.userId)
    .filter(Boolean);

  const result = await prisma.$transaction(async (tx) => {
    const lockedUserIds = [...new Set([item.userId, ...topUserIds])].sort();
    const lockedItemIds = [...new Set([itemId, ...topCounterpartIds])].sort();
    await lockMatchingRows(tx, lockedUserIds, lockedItemIds);

    const currentItems = await tx.item.findMany({
      where: { id: { in: lockedItemIds } },
      select: guardedMatchingItemSelect,
    });
    const currentById = new Map(currentItems.map(current => [current.id, current]));
    const currentSource = currentById.get(itemId);

    // Never let an old worker erase or overwrite matches already produced for
    // a newer content revision or claim.
    if (
      currentSource
      && (
        currentSource.contentRevision !== expectedContentRevision
        || !workerClaimMatches(currentSource, expectedMatchingLockedAt)
      )
    ) return { matches: [], notifications: [] };

    if (!isMatchableItem(currentSource)) {
      await tx.match.deleteMany({
        where: { OR: [{ lostItemId: itemId }, { foundItemId: itemId }] },
      });
      return { matches: [], notifications: [] };
    }

    // A counterpart can be edited, moderated, banned, or removed while scores
    // are being calculated. Persist only exact, still-eligible snapshots.
    const validTop = top.filter((match) => {
      const counterpartId = match[counterpartField];
      const snapshot = candidateSnapshots.get(counterpartId);
      const current = currentById.get(counterpartId);
      return Boolean(
        snapshot
        && current
        && current.contentRevision === snapshot.contentRevision
        && isMatchableItem(current)
        && current.type === counterType
        && current.category === currentSource.category
        && current.userId !== currentSource.userId,
      );
    });
    const retainedCounterpartIds = validTop.map(match => match[counterpartField]);

    for (const [index, match] of validTop.entries()) {
      await tx.match.upsert({
        where: { lostItemId_foundItemId: { lostItemId: match.lostItemId, foundItemId: match.foundItemId } },
        create: { ...match, [rankField]: index + 1, isNotified: false },
        update: { score: match.score, breakdown: match.breakdown, [rankField]: index + 1 },
      });
    }
    await tx.match.updateMany({
      where: {
        [sourceField]: itemId,
        ...(retainedCounterpartIds.length
          ? { [counterpartField]: { notIn: retainedCounterpartIds } }
          : {}),
      },
      data: { [rankField]: null },
    });
    await tx.match.deleteMany({
      where: {
        lostRank: null,
        foundRank: null,
        OR: [{ lostItemId: itemId }, { foundItemId: itemId }],
      },
    });

    // Ranking, the notification claim, and durable notification inserts share
    // the same locks and transaction, closing the validation-to-notify race.
    const highConfidencePairs = validTop.filter(match => match.score >= 60).map(match => ({
      lostItemId: match.lostItemId,
      foundItemId: match.foundItemId,
    }));
    const highConfidence = highConfidencePairs.length
      ? await tx.match.findMany({
          where: { isNotified: false, OR: highConfidencePairs },
          include: {
            lostItem: { select: { userId: true, title: true } },
            foundItem: { select: { userId: true, title: true } },
          },
        })
      : [];

    const notifications = [];
    for (const match of highConfidence) {
      const claimed = await tx.match.updateMany({
        where: { id: match.id, isNotified: false },
        data: { isNotified: true },
      });
      if (!claimed.count) continue;

      if (match.lostItem) {
        notifications.push(await tx.notification.create({
          data: {
            userId: match.lostItem.userId,
            type: 'MATCH_FOUND',
            title: `Possible match found! (${match.score}% match)`,
            body: `A found item matches your lost "${match.lostItem.title}"`,
            link: `/items/${match.lostItemId}`,
          },
        }));
      }
      if (match.foundItem) {
        notifications.push(await tx.notification.create({
          data: {
            userId: match.foundItem.userId,
            type: 'MATCH_FOUND',
            title: `Possible owner found! (${match.score}% match)`,
            body: 'Your found item may match a lost report',
            link: `/items/${match.foundItemId}`,
          },
        }));
      }
    }

    return { matches: validTop, notifications };
  }, { maxWait: 5_000, timeout: 15_000 });

  result.notifications.forEach(emitNotification);
  return result.matches;
}

// ─── Get Matches for an Item ──────────────────────────────────────────────────
async function getMatchesForItem(itemId) {
  const item = await prisma.item.findFirst({
    where: {
      id: itemId,
      isApproved: true,
      deletedAt: null,
      status: { in: MATCHABLE_ITEM_STATUSES },
      user: { isBanned: false },
    },
    select: { type: true },
  });
  if (!item) return [];

  const matches = item.type === 'LOST'
    ? await prisma.match.findMany({
        where: {
          lostItemId: itemId,
          OR: [{ lostRank: { not: null } }, { foundRank: { not: null } }],
          foundItem: {
            isApproved: true,
            deletedAt: null,
            status: { in: MATCHABLE_ITEM_STATUSES },
            user: { isBanned: false },
          },
        },
        orderBy: { score: 'desc' },
        take: 50,
        include: {
          foundItem: { select: { ...publicItemSelect, images: primaryImageSelect, user: { select: publicUserSelect } } },
        },
      })
    : await prisma.match.findMany({
        where: {
          foundItemId: itemId,
          OR: [{ lostRank: { not: null } }, { foundRank: { not: null } }],
          lostItem: {
            isApproved: true,
            deletedAt: null,
            status: { in: MATCHABLE_ITEM_STATUSES },
            user: { isBanned: false },
          },
        },
        orderBy: { score: 'desc' },
        take: 50,
        include: {
          lostItem: { select: { ...publicItemSelect, images: primaryImageSelect, user: { select: publicUserSelect } } },
        },
      });

  return matches.map(({ lostRank, foundRank, ...match }) => match);
}

module.exports = { computeMatches, getMatchesForItem, computeScore, MATCHABLE_ITEM_STATUSES };

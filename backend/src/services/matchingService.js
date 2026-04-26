const { PrismaClient } = require('@prisma/client');
const { createNotification } = require('./notificationService');

const prisma = new PrismaClient();

// ─── Keyword Overlap Score (0-1) ──────────────────────────────────────────────
function keywordScore(textA, textB) {
  const tokenize = (str) =>
    str.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
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
  if (!latA || !lngA || !latB || !lngB) {
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
async function computeMatches(itemId) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item || item.status !== 'ACTIVE') return;

  const MIN_SCORE = 30; // Only store matches above this threshold

  // Find counterpart items (if item is LOST, find FOUND items; vice versa)
  const counterType = item.type === 'LOST' ? 'FOUND' : 'LOST';
  const candidates = await prisma.item.findMany({
    where: {
      type: counterType,
      status: 'ACTIVE',
      isApproved: true,
      category: item.category, // Quick pre-filter by category
    },
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

  // Upsert matches (sort by score descending, keep top 20)
  const top = matches.sort((a, b) => b.score - a.score).slice(0, 20);

  for (const match of top) {
    await prisma.match.upsert({
      where: { lostItemId_foundItemId: { lostItemId: match.lostItemId, foundItemId: match.foundItemId } },
      create: { ...match, isNotified: false },
      update: { score: match.score, breakdown: match.breakdown },
    });
  }

  // Notify item owners of new high-confidence matches (score >= 60)
  const highConfidence = top.filter(m => m.score >= 60 && !m.isNotified);
  for (const match of highConfidence) {
    const lostItem = await prisma.item.findUnique({ where: { id: match.lostItemId }, select: { userId: true, title: true } });
    const foundItem = await prisma.item.findUnique({ where: { id: match.foundItemId }, select: { userId: true, title: true } });

    if (lostItem) {
      await createNotification(
        lostItem.userId, 'MATCH_FOUND',
        `Possible match found! (${match.score}% match)`,
        `A found item matches your lost "${lostItem.title}"`,
        `/items/${match.lostItemId}`
      );
    }
    if (foundItem) {
      await createNotification(
        foundItem.userId, 'MATCH_FOUND',
        `Possible owner found! (${match.score}% match)`,
        `Your found item may match a lost report`,
        `/items/${match.foundItemId}`
      );
    }

    await prisma.match.update({
      where: { lostItemId_foundItemId: { lostItemId: match.lostItemId, foundItemId: match.foundItemId } },
      data: { isNotified: true },
    });
  }

  return top;
}

// ─── Get Matches for an Item ──────────────────────────────────────────────────
async function getMatchesForItem(itemId) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return [];

  const matches = item.type === 'LOST'
    ? await prisma.match.findMany({
        where: { lostItemId: itemId },
        orderBy: { score: 'desc' },
        include: {
          foundItem: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      })
    : await prisma.match.findMany({
        where: { foundItemId: itemId },
        orderBy: { score: 'desc' },
        include: {
          lostItem: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      });

  return matches;
}

module.exports = { computeMatches, getMatchesForItem, computeScore };

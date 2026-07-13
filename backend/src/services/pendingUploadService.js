const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { deleteFromCloudinary } = require('./cloudinaryService');

const UPLOAD_TTL_MS = 60 * 60 * 1000;
const CLEANUP_CLAIM_STALE_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const UPLOAD_TOKEN_ISSUER = 'reclaim-api';
const UPLOAD_TOKEN_AUDIENCE = 'reclaim-upload';

function uploadReceiptSecret() {
  if (process.env.UPLOAD_RECEIPT_SECRET) return process.env.UPLOAD_RECEIPT_SECRET;
  // Development/test fallback still uses a domain-separated key, so an upload
  // receipt can never verify as an access token without extra local setup.
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update('reclaim:upload-receipts:v1')
    .digest('hex');
}

function requestError(message, status = 400, code) {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}

function createPendingDescriptor(userId) {
  const id = crypto.randomUUID();
  return {
    id,
    userId,
    publicId: `reclaim/items/${id}`,
    expiresAt: new Date(Date.now() + UPLOAD_TTL_MS),
  };
}

function signUploadReceipt(upload) {
  const maxAgeSeconds = Math.max(1, Math.floor((upload.expiresAt.getTime() - Date.now()) / 1000));
  return jwt.sign(
    {
      purpose: 'item-upload',
      uploadId: upload.id,
      userId: upload.userId,
      url: upload.url,
      publicId: upload.publicId,
    },
    uploadReceiptSecret(),
    {
      expiresIn: maxAgeSeconds,
      algorithm: 'HS256',
      jwtid: upload.id,
      issuer: UPLOAD_TOKEN_ISSUER,
      audience: UPLOAD_TOKEN_AUDIENCE,
      subject: upload.userId,
    }
  );
}

function verifyUploadReceipt(token, expected = {}) {
  let payload;
  try {
    payload = jwt.verify(token, uploadReceiptSecret(), {
      algorithms: ['HS256'],
      issuer: UPLOAD_TOKEN_ISSUER,
      audience: UPLOAD_TOKEN_AUDIENCE,
    });
  } catch {
    throw requestError('An upload receipt is invalid or has expired');
  }

  const valid = payload.purpose === 'item-upload' &&
    typeof payload.uploadId === 'string' &&
    payload.jti === payload.uploadId &&
    typeof payload.userId === 'string' &&
    payload.sub === payload.userId &&
    typeof payload.url === 'string' &&
    typeof payload.publicId === 'string' &&
    (!expected.userId || payload.userId === expected.userId) &&
    (!expected.url || payload.url === expected.url) &&
    (!expected.publicId || payload.publicId === expected.publicId);

  if (!valid) throw requestError('Invalid image upload receipt');
  return {
    id: payload.uploadId,
    userId: payload.userId,
    url: payload.url,
    publicId: payload.publicId,
  };
}

function receiptsFromLegacyArrays(body, userId) {
  const urls = body.imageUrls || [];
  const publicIds = body.imagePublicIds || [];
  const tokens = body.imageUploadTokens || [];
  if (urls.length !== publicIds.length || urls.length !== tokens.length) {
    throw requestError('Every image must include a valid upload receipt');
  }
  return tokens.map((token, index) => verifyUploadReceipt(token, {
    userId,
    url: urls[index],
    publicId: publicIds[index],
  }));
}

function receiptsFromImageEntries(images, userId) {
  return (images || [])
    .filter((image) => !image.id)
    .map((image) => verifyUploadReceipt(image.uploadToken, {
      userId,
      url: image.url,
      publicId: image.publicId,
    }));
}

async function consumePendingUploads(tx, userId, receipts) {
  if (!receipts.length) return [];

  const uploadIds = receipts.map((receipt) => receipt.id);
  const publicIds = receipts.map((receipt) => receipt.publicId);
  if (new Set(uploadIds).size !== uploadIds.length || new Set(publicIds).size !== publicIds.length) {
    throw requestError('An uploaded image can only be attached once', 409, 'UPLOAD_ALREADY_USED');
  }

  const now = new Date();
  const pending = await tx.pendingUpload.findMany({
    where: {
      id: { in: uploadIds },
      userId,
      url: { not: null },
      expiresAt: { gt: now },
      cleanupClaimedAt: null,
    },
    select: { id: true, url: true, publicId: true },
  });
  const byId = new Map(pending.map((upload) => [upload.id, upload]));
  const allMatch = receipts.every((receipt) => {
    const stored = byId.get(receipt.id);
    return stored?.url === receipt.url && stored.publicId === receipt.publicId;
  });
  if (!allMatch || pending.length !== receipts.length) {
    throw requestError(
      'One or more uploaded images are invalid, expired, or already used',
      409,
      'UPLOAD_ALREADY_USED'
    );
  }

  const claimed = await tx.pendingUpload.deleteMany({
    where: {
      id: { in: uploadIds },
      userId,
      expiresAt: { gt: now },
      cleanupClaimedAt: null,
    },
  });
  if (claimed.count !== receipts.length) {
    throw requestError(
      'One or more uploaded images are invalid, expired, or already used',
      409,
      'UPLOAD_ALREADY_USED'
    );
  }

  return receipts;
}

async function queueAssetsForCleanup(tx, userId, assets) {
  if (!assets.length) return [];
  const expiresAt = new Date();
  const queued = assets.map((asset) => ({
    id: crypto.randomUUID(),
    userId,
    url: asset.url || null,
    publicId: asset.publicId,
    expiresAt,
  }));
  await tx.pendingUpload.createMany({ data: queued });
  return queued.map((upload) => upload.id);
}

async function cleanupPendingUploads(options = {}) {
  const { ids, userId, limit = 25 } = options;
  const now = new Date();
  const staleClaim = new Date(now.getTime() - CLEANUP_CLAIM_STALE_MS);
  const candidates = await prisma.pendingUpload.findMany({
    where: {
      ...(ids?.length ? { id: { in: ids } } : { expiresAt: { lte: now } }),
      ...(userId ? { userId } : {}),
      OR: [
        { cleanupClaimedAt: null },
        { cleanupClaimedAt: { lte: staleClaim } },
      ],
    },
    orderBy: { expiresAt: 'asc' },
    take: Math.min(Math.max(limit, 1), 100),
    select: { id: true, publicId: true },
  });

  let deleted = 0;
  let failed = 0;
  for (const candidate of candidates) {
    const cleanupClaimedAt = new Date();
    const claimed = await prisma.pendingUpload.updateMany({
      where: {
        id: candidate.id,
        ...(userId ? { userId } : {}),
        OR: [
          { cleanupClaimedAt: null },
          { cleanupClaimedAt: { lte: staleClaim } },
        ],
      },
      data: { cleanupClaimedAt },
    });
    if (!claimed.count) continue;

    const removed = await deleteFromCloudinary(candidate.publicId);
    if (removed) {
      await prisma.pendingUpload.deleteMany({
        where: { id: candidate.id, cleanupClaimedAt },
      });
      deleted += 1;
    } else {
      await prisma.pendingUpload.updateMany({
        where: { id: candidate.id, cleanupClaimedAt },
        data: { cleanupClaimedAt: null },
      });
      failed += 1;
    }
  }
  return { candidates: candidates.length, deleted, failed };
}

let cleanupPromise = null;
let lastCleanupStartedAt = 0;

function schedulePendingUploadCleanup(options = {}) {
  const force = Boolean(options.ids?.length);
  if (cleanupPromise) return cleanupPromise;
  if (!force && Date.now() - lastCleanupStartedAt < CLEANUP_INTERVAL_MS) {
    return Promise.resolve({ candidates: 0, deleted: 0, failed: 0 });
  }

  lastCleanupStartedAt = Date.now();
  cleanupPromise = cleanupPendingUploads(options)
    .catch((error) => {
      console.error('Pending upload cleanup failed:', error);
      throw error;
    })
    .finally(() => { cleanupPromise = null; });
  return cleanupPromise;
}

module.exports = {
  UPLOAD_TTL_MS,
  cleanupPendingUploads,
  consumePendingUploads,
  createPendingDescriptor,
  queueAssetsForCleanup,
  receiptsFromImageEntries,
  receiptsFromLegacyArrays,
  schedulePendingUploadCleanup,
  signUploadReceipt,
  verifyUploadReceipt,
};

const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);
const TERMINAL_ITEM_STATUSES = new Set(['RETURNED', 'CLOSED', 'REJECTED']);

function reviewError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function notificationForReviewedClaim(claim, status, reviewedByAdmin) {
  if (status === 'APPROVED') {
    return {
      userId: claim.claimantId,
      type: 'CLAIM_APPROVED',
      title: 'Your claim was approved!',
      body: reviewedByAdmin
        ? `Your claim for "${claim.item.title}" has been approved by an admin.`
        : `Your claim for "${claim.item.title}" has been approved. Please coordinate with the finder.`,
      link: `/items/${claim.itemId}`,
    };
  }

  return {
    userId: claim.claimantId,
    type: 'CLAIM_REJECTED',
    title: 'Claim not approved',
    body: `Your claim for "${claim.item.title}" was not approved.`,
    link: `/items/${claim.itemId}`,
  };
}

/**
 * Reviews a claim while holding a row lock on its item.
 *
 * All reviews for an item are therefore serialized, regardless of whether they
 * came through the owner or admin route. Notifications are inserted in the
 * same transaction and returned for realtime emission only after commit.
 */
async function reviewClaim({
  claimId,
  status,
  adminNote,
  reviewerId,
  reviewerRole,
  adminReview = false,
  prismaClient = prisma,
}) {
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw reviewError(400, 'Status must be APPROVED or REJECTED');
  }

  return prismaClient.$transaction(async (tx) => {
    // Lock the parent item, not just this claim. This gives every review for
    // the same listing one shared serialization point and closes approve vs.
    // reject and approve vs. approve races.
    const lockedItems = await tx.$queryRaw(Prisma.sql`
      SELECT c."itemId"
      FROM "Claim" c
      JOIN "Item" i ON i."id" = c."itemId"
      WHERE c."id" = ${claimId}
      FOR UPDATE OF i
    `);

    if (lockedItems.length === 0) throw reviewError(404, 'Claim not found');

    const claim = await tx.claim.findUnique({
      where: { id: claimId },
      include: {
        item: {
          select: {
            id: true,
            title: true,
            userId: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });
    if (!claim) throw reviewError(404, 'Claim not found');

    const reviewerIsAdmin = ADMIN_ROLES.has(reviewerRole);
    if ((adminReview && !reviewerIsAdmin)
      || (!adminReview && claim.item.userId !== reviewerId && !reviewerIsAdmin)) {
      throw reviewError(403, 'Forbidden');
    }
    if (claim.item.deletedAt) throw reviewError(409, 'The item is no longer available');
    if (claim.status !== 'PENDING') throw reviewError(409, 'Claim has already been reviewed');

    if (status === 'APPROVED') {
      const existingApproval = await tx.claim.findFirst({
        where: { itemId: claim.itemId, status: 'APPROVED', id: { not: claimId } },
        select: { id: true },
      });
      if (existingApproval) throw reviewError(409, 'Another claim has already been approved');
    }

    const displacedClaims = status === 'APPROVED'
      ? await tx.claim.findMany({
          where: { itemId: claim.itemId, id: { not: claimId }, status: 'PENDING' },
          select: { claimantId: true },
        })
      : [];

    const updateResult = await tx.claim.updateMany({
      where: { id: claimId, status: 'PENDING' },
      data: { status, adminNote, reviewedAt: new Date(), reviewedBy: reviewerId },
    });
    if (updateResult.count !== 1) throw reviewError(409, 'Claim has already been reviewed');

    if (status === 'APPROVED') {
      await tx.claim.updateMany({
        where: { itemId: claim.itemId, id: { not: claimId }, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          adminNote: 'Another claim was approved',
          reviewedAt: new Date(),
          reviewedBy: reviewerId,
        },
      });
    }

    const approvedClaim = status === 'APPROVED'
      ? { id: claimId }
      : await tx.claim.findFirst({
          where: { itemId: claim.itemId, status: 'APPROVED' },
          select: { id: true },
        });

    if (approvedClaim) {
      await tx.item.update({
        where: { id: claim.itemId },
        data: {
          status: 'RETURNED',
          matchingPending: false,
          matchingLockedAt: null,
          matchingRetryAt: null,
        },
      });
      await tx.match.deleteMany({
        where: { OR: [{ lostItemId: claim.itemId }, { foundItemId: claim.itemId }] },
      });
    } else if (!TERMINAL_ITEM_STATUSES.has(claim.item.status)) {
      const pendingClaims = await tx.claim.count({
        where: { itemId: claim.itemId, status: 'PENDING' },
      });
      await tx.item.update({
        where: { id: claim.itemId },
        data: { status: pendingClaims > 0 ? 'CLAIM_PENDING' : 'ACTIVE' },
      });
    }

    const notifications = [];
    notifications.push(await tx.notification.create({
      data: notificationForReviewedClaim(claim, status, adminReview),
    }));

    if (status === 'APPROVED') {
      for (const displaced of displacedClaims) {
        notifications.push(await tx.notification.create({
          data: {
            userId: displaced.claimantId,
            type: 'CLAIM_REJECTED',
            title: 'Claim not approved',
            body: `Another claim for "${claim.item.title}" was approved.`,
            link: `/items/${claim.itemId}`,
          },
        }));
      }
    }

    const updatedClaim = await tx.claim.findUnique({ where: { id: claimId } });
    return { claim: updatedClaim, notifications };
  });
}

module.exports = { reviewClaim };

-- Repair any historic duplicate approvals before enforcing the invariant.
WITH ranked_approvals AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "itemId"
      ORDER BY "reviewedAt" ASC NULLS LAST, "updatedAt" ASC, "id" ASC
    ) AS approval_rank
  FROM "Claim"
  WHERE "status" = 'APPROVED'
)
UPDATE "Claim" AS claim
SET
  "status" = 'REJECTED',
  "adminNote" = COALESCE(claim."adminNote", 'Superseded while enforcing one approved claim per item'),
  "updatedAt" = CURRENT_TIMESTAMP
FROM ranked_approvals
WHERE claim."id" = ranked_approvals."id"
  AND ranked_approvals.approval_rank > 1;

-- An approved claim is authoritative for the item lifecycle.
UPDATE "Item" AS item
SET
  "status" = 'RETURNED',
  "matchingPending" = FALSE,
  "matchingLockedAt" = NULL,
  "matchingRetryAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1
  FROM "Claim" AS claim
  WHERE claim."itemId" = item."id"
    AND claim."status" = 'APPROVED'
);

DELETE FROM "Match" AS match
WHERE EXISTS (
  SELECT 1
  FROM "Claim" AS claim
  WHERE claim."status" = 'APPROVED'
    AND (claim."itemId" = match."lostItemId" OR claim."itemId" = match."foundItemId")
);

CREATE UNIQUE INDEX "Claim_one_approved_per_item"
ON "Claim"("itemId")
WHERE "status" = 'APPROVED';

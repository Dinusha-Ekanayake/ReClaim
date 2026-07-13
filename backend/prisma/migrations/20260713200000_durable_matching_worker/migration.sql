-- Persist matching jobs on the item itself so work is not lost when an API
-- process restarts between accepting a report and computing its matches.
ALTER TABLE "Item"
  ADD COLUMN "matchingPending" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "matchingLockedAt" TIMESTAMP(3),
  ADD COLUMN "matchingRetryAt" TIMESTAMP(3),
  ADD COLUMN "matchingAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "matchingLastError" TEXT;

-- Queue existing eligible public reports once so they benefit from the new
-- worker. New reports remain pending moderation and approval explicitly queues
-- them later.
UPDATE "Item"
SET "matchingPending" = true
WHERE "isApproved" = true
  AND "status" IN ('ACTIVE', 'MATCHED', 'CLAIM_PENDING');

CREATE INDEX "Item_matchingPending_isApproved_status_matchingRetryAt_createdAt_idx"
  ON "Item"("matchingPending", "isApproved", "status", "matchingRetryAt", "createdAt");

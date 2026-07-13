-- Content revisions let moderators approve the exact report version they
-- reviewed. deletedAt supports evidence-preserving item removal.
ALTER TABLE "Item"
  ADD COLUMN "contentRevision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Legacy orphan conversations cannot satisfy the new relation and are already
-- unusable by the application, so remove them before adding the constraint.
DELETE FROM "Chat" c
WHERE c."itemId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Item" i WHERE i."id" = c."itemId");

ALTER TABLE "Chat"
  ADD CONSTRAINT "Chat_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Chat_itemId_idx" ON "Chat"("itemId");
CREATE INDEX "Item_deletedAt_isApproved_status_createdAt_idx"
  ON "Item"("deletedAt", "isApproved", "status", "createdAt");

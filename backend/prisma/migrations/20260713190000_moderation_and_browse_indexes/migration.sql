-- New reports enter the moderation queue by default. Existing rows retain
-- their current approval state.
ALTER TABLE "Item" ALTER COLUMN "isApproved" SET DEFAULT false;

CREATE INDEX "Item_isApproved_status_dateLostFound_idx"
  ON "Item"("isApproved", "status", "dateLostFound");
CREATE INDEX "Item_isApproved_status_updatedAt_idx"
  ON "Item"("isApproved", "status", "updatedAt");
CREATE INDEX "Item_category_isApproved_status_createdAt_idx"
  ON "Item"("category", "isApproved", "status", "createdAt");

-- Index-only hardening for the application's ordered/filtering query paths.
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

DROP INDEX IF EXISTS "Item_type_status_isApproved_category_idx";
CREATE INDEX "Item_type_status_isApproved_category_createdAt_idx"
  ON "Item"("type", "status", "isApproved", "category", "createdAt");

CREATE INDEX "ItemImage_publicId_idx" ON "ItemImage"("publicId");

CREATE INDEX "Comment_itemId_parentId_isHidden_createdAt_idx"
  ON "Comment"("itemId", "parentId", "isHidden", "createdAt");
CREATE INDEX "Comment_parentId_isHidden_createdAt_idx"
  ON "Comment"("parentId", "isHidden", "createdAt");

DROP INDEX IF EXISTS "Notification_userId_isRead_idx";
CREATE INDEX "Notification_userId_isRead_createdAt_idx"
  ON "Notification"("userId", "isRead", "createdAt");

DROP INDEX IF EXISTS "Report_status_idx";
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

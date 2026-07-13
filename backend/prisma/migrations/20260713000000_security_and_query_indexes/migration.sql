-- Prevent duplicate submissions even when concurrent requests race.
DELETE FROM "Claim" newer
USING "Claim" older
WHERE newer."itemId" = older."itemId"
  AND newer."claimantId" = older."claimantId"
  AND (newer."createdAt", newer."id") > (older."createdAt", older."id");

DELETE FROM "Report" newer
USING "Report" older
WHERE newer."itemId" = older."itemId"
  AND newer."reporterId" = older."reporterId"
  AND (newer."createdAt", newer."id") > (older."createdAt", older."id");

CREATE UNIQUE INDEX "Claim_itemId_claimantId_key" ON "Claim"("itemId", "claimantId");
CREATE UNIQUE INDEX "Report_itemId_reporterId_key" ON "Report"("itemId", "reporterId");

-- Match the application's most frequent filtering and ordering patterns.
CREATE INDEX "Item_isApproved_status_createdAt_idx" ON "Item"("isApproved", "status", "createdAt");
CREATE INDEX "Item_type_status_isApproved_category_idx" ON "Item"("type", "status", "isApproved", "category");
CREATE INDEX "Item_userId_status_createdAt_idx" ON "Item"("userId", "status", "createdAt");
CREATE INDEX "Claim_itemId_status_createdAt_idx" ON "Claim"("itemId", "status", "createdAt");
CREATE INDEX "Claim_claimantId_createdAt_idx" ON "Claim"("claimantId", "createdAt");
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");
CREATE INDEX "Message_chatId_isRead_senderId_idx" ON "Message"("chatId", "isRead", "senderId");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- Speed up the case-insensitive contains searches used by item/user filters.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Item_title_trgm_idx" ON "Item" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Item_description_trgm_idx" ON "Item" USING GIN ("description" gin_trgm_ops);
CREATE INDEX "Item_brand_trgm_idx" ON "Item" USING GIN ("brand" gin_trgm_ops);
CREATE INDEX "Item_locationLabel_trgm_idx" ON "Item" USING GIN ("locationLabel" gin_trgm_ops);
CREATE INDEX "User_name_trgm_idx" ON "User" USING GIN ("name" gin_trgm_ops);

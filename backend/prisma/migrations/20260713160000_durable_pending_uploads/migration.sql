-- Persist upload ownership before an asset can be attached to an item.
CREATE TABLE "PendingUpload" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "url" TEXT,
  "publicId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "cleanupClaimedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendingUpload_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingUpload_publicId_key" ON "PendingUpload"("publicId");
CREATE INDEX "PendingUpload_userId_expiresAt_idx" ON "PendingUpload"("userId", "expiresAt");
CREATE INDEX "PendingUpload_expiresAt_cleanupClaimedAt_idx"
  ON "PendingUpload"("expiresAt", "cleanupClaimedAt");

ALTER TABLE "PendingUpload"
  ADD CONSTRAINT "PendingUpload_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve deterministic image ordering. Existing primary images remain first.
ALTER TABLE "ItemImage" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "itemId"
           ORDER BY "isPrimary" DESC, "createdAt" ASC, "id" ASC
         )::INTEGER - 1 AS position
  FROM "ItemImage"
)
UPDATE "ItemImage" image
SET "position" = ranked.position
FROM ranked
WHERE image."id" = ranked."id";

UPDATE "ItemImage"
SET "isPrimary" = ("position" = 0);

-- Old replayable receipts could have attached one Cloudinary public ID more
-- than once. Quarantine every duplicated reference instead of choosing one row
-- that would later delete the shared asset and break the other listings. URLs
-- remain intact; these legacy shared assets can be reconciled manually.
WITH duplicated AS (
  SELECT "publicId"
  FROM "ItemImage"
  GROUP BY "publicId"
  HAVING COUNT(*) > 1
)
UPDATE "ItemImage" image
SET "publicId" = '__legacy_shared_asset__/' || image."id"
WHERE image."publicId" IN (SELECT "publicId" FROM duplicated);

DROP INDEX IF EXISTS "ItemImage_itemId_idx";
DROP INDEX IF EXISTS "ItemImage_publicId_idx";
CREATE UNIQUE INDEX "ItemImage_publicId_key" ON "ItemImage"("publicId");
CREATE INDEX "ItemImage_itemId_position_idx" ON "ItemImage"("itemId", "position");

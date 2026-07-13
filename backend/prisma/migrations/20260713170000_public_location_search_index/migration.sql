-- Public search uses the deliberately approximate area, never the private
-- exact label. Keep the database index aligned with that privacy boundary.
DROP INDEX IF EXISTS "Item_locationLabel_trgm_idx";
CREATE INDEX "Item_locationArea_trgm_idx"
  ON "Item" USING GIN ("locationArea" gin_trgm_ops)
  WHERE "locationArea" IS NOT NULL;

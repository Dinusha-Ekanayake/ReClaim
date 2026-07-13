-- Track each side's ranking independently. A shared Match row must not be
-- deleted merely because it falls outside the counterpart's top twenty.
ALTER TABLE "Match"
  ADD COLUMN "lostRank" INTEGER,
  ADD COLUMN "foundRank" INTEGER;

-- Preserve legacy matches until both reports have been processed by the new
-- worker. Subsequent passes replace these placeholder ranks.
UPDATE "Match" SET "lostRank" = 1, "foundRank" = 1;

CREATE INDEX "Match_lostItemId_lostRank_idx" ON "Match"("lostItemId", "lostRank");
CREATE INDEX "Match_foundItemId_foundRank_idx" ON "Match"("foundItemId", "foundRank");

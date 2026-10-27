WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "leadId" ORDER BY "updatedAt" DESC, "id" DESC) AS position
  FROM "QuickItinerary"
  WHERE "leadId" IS NOT NULL
)
DELETE FROM "QuickItinerary" itinerary
USING ranked
WHERE itinerary."id" = ranked."id" AND ranked.position > 1;

DROP INDEX IF EXISTS "QuickItinerary_leadId_updatedAt_idx";
CREATE UNIQUE INDEX "QuickItinerary_leadId_key" ON "QuickItinerary"("leadId");

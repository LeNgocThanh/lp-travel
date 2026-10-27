ALTER TABLE "QuickTourProgram" ADD COLUMN "sourceItineraryId" TEXT;

CREATE UNIQUE INDEX "QuickTourProgram_sourceItineraryId_key" ON "QuickTourProgram"("sourceItineraryId");

ALTER TABLE "QuickTourProgram" ADD CONSTRAINT "QuickTourProgram_sourceItineraryId_fkey" FOREIGN KEY ("sourceItineraryId") REFERENCES "QuickItinerary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

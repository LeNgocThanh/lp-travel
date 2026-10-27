ALTER TABLE "QuickItinerary" ADD COLUMN "leadId" TEXT;
CREATE INDEX "QuickItinerary_leadId_updatedAt_idx" ON "QuickItinerary"("leadId", "updatedAt");
ALTER TABLE "QuickItinerary" ADD CONSTRAINT "QuickItinerary_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "QuickItineraryDayTourGuide" (
  "id" TEXT NOT NULL,
  "itineraryDayId" TEXT NOT NULL,
  "tourGuideId" TEXT,
  "tourGuideName" TEXT NOT NULL,
  "tourGuideIdentity" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'PRIMARY',
  "notes" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "QuickItineraryDayTourGuide_pkey" PRIMARY KEY ("id")
);

INSERT INTO "QuickItineraryDayTourGuide" ("id", "itineraryDayId", "tourGuideId", "tourGuideName", "tourGuideIdentity", "role", "displayOrder", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || day."id"), day."id", day."tourGuideId", COALESCE(day."tourGuideName", guide."fullName"), COALESCE(day."tourGuideIdentity", guide."identityNumber"), 'PRIMARY', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "QuickItineraryDay" day
JOIN "TourGuide" guide ON guide."id" = day."tourGuideId"
WHERE day."tourGuideId" IS NOT NULL;

CREATE UNIQUE INDEX "QuickItineraryDayTourGuide_itineraryDayId_tourGuideId_key" ON "QuickItineraryDayTourGuide"("itineraryDayId", "tourGuideId");
CREATE INDEX "QuickItineraryDayTourGuide_itineraryDayId_displayOrder_idx" ON "QuickItineraryDayTourGuide"("itineraryDayId", "displayOrder");
CREATE INDEX "QuickItineraryDayTourGuide_tourGuideId_idx" ON "QuickItineraryDayTourGuide"("tourGuideId");

ALTER TABLE "QuickItineraryDayTourGuide" ADD CONSTRAINT "QuickItineraryDayTourGuide_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "QuickItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuickItineraryDayTourGuide" ADD CONSTRAINT "QuickItineraryDayTourGuide_tourGuideId_fkey" FOREIGN KEY ("tourGuideId") REFERENCES "TourGuide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

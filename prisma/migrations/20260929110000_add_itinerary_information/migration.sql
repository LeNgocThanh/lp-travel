ALTER TABLE "QuickItinerary"
  ADD COLUMN "inclusions" TEXT,
  ADD COLUMN "exclusions" TEXT,
  ADD COLUMN "informationNotes" TEXT;

CREATE TABLE "ItineraryInformationSetting" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "inclusions" TEXT NOT NULL DEFAULT '',
  "exclusions" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ItineraryInformationSetting_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkCaseItineraryDay"
ADD COLUMN "overnight" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "overnightLocation" TEXT;

ALTER TABLE "QuickItineraryDay"
ADD COLUMN "overnight" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "overnightLocation" TEXT;

ALTER TABLE "QuickItineraryDay"
ADD COLUMN "guidePickup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "guidePickupNote" TEXT,
ADD COLUMN "guideDropoff" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "guideDropoffNote" TEXT;

ALTER TABLE "TourGuideContract"
ADD COLUMN "pickupDropoffContent" TEXT,
ADD COLUMN "otherAgreements" TEXT;

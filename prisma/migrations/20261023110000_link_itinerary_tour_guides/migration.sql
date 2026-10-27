ALTER TABLE "QuickItineraryDay"
ADD COLUMN "tourGuideId" TEXT,
ADD COLUMN "tourGuideName" TEXT,
ADD COLUMN "tourGuideIdentity" TEXT;

UPDATE "QuickItineraryDay"
SET "tourGuide" = TRUE
WHERE "transport" ~* '(^|,\s*)ESG(\s*,|$)';

UPDATE "QuickItineraryDay"
SET "transport" = CASE
  WHEN "transport" IS NULL OR BTRIM("transport") = '' THEN 'ESG'
  WHEN "transport" !~* '(^|,\s*)ESG(\s*,|$)' THEN "transport" || ', ESG'
  ELSE "transport"
END
WHERE "tourGuide" = TRUE;

CREATE INDEX "QuickItineraryDay_tourGuideId_idx" ON "QuickItineraryDay"("tourGuideId");

ALTER TABLE "QuickItineraryDay" ADD CONSTRAINT "QuickItineraryDay_tourGuideId_fkey" FOREIGN KEY ("tourGuideId") REFERENCES "TourGuide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

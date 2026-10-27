CREATE TABLE "QuickTourProgramGuide" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "tourGuideId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "QuickTourProgramGuide_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuickTourProgramGuide_programId_displayOrder_key" ON "QuickTourProgramGuide"("programId", "displayOrder");
CREATE INDEX "QuickTourProgramGuide_tourGuideId_idx" ON "QuickTourProgramGuide"("tourGuideId");

ALTER TABLE "QuickTourProgramGuide" ADD CONSTRAINT "QuickTourProgramGuide_programId_fkey" FOREIGN KEY ("programId") REFERENCES "QuickTourProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuickTourProgramGuide" ADD CONSTRAINT "QuickTourProgramGuide_tourGuideId_fkey" FOREIGN KEY ("tourGuideId") REFERENCES "TourGuide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "QuickTourProgramGuide" ("id", "programId", "name", "phone", "displayOrder")
SELECT CONCAT('legacy_', "id"), "id", "tourGuideName", "tourGuidePhone", 0
FROM "QuickTourProgram"
WHERE "tourGuideName" IS NOT NULL AND BTRIM("tourGuideName") <> '';

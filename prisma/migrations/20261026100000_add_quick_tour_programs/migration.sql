CREATE TABLE "QuickTourProgram" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "durationText" TEXT, "transportText" TEXT, "departureText" TEXT,
  "programName" TEXT NOT NULL, "tourCode" TEXT, "guestSummary" TEXT, "startDate" TIMESTAMP(3), "endDate" TIMESTAMP(3),
  "groupLeaderName" TEXT, "groupLeaderPhone" TEXT, "vehiclePlate" TEXT, "driverName" TEXT, "driverPhone" TEXT,
  "tourGuideName" TEXT, "tourGuidePhone" TEXT, "closingText" TEXT, "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "headerTemplateId" TEXT, "headerContent" TEXT, "headerImageFolderId" TEXT, "headerImageStoredName" TEXT, "headerImageMimeType" TEXT, "headerImageAlt" TEXT,
  "footerTemplateId" TEXT, "footerContent" TEXT, "footerImageFolderId" TEXT, "footerImageStoredName" TEXT, "footerImageMimeType" TEXT, "footerImageAlt" TEXT,
  "createdByType" TEXT NOT NULL, "createdById" TEXT NOT NULL, "createdByName" TEXT NOT NULL,
  "updatedByType" TEXT NOT NULL, "updatedById" TEXT NOT NULL, "updatedByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuickTourProgram_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "QuickTourProgramDay" ("id" TEXT NOT NULL, "programId" TEXT NOT NULL, "dayLabel" TEXT NOT NULL, "date" TIMESTAMP(3), "title" TEXT NOT NULL, "breakfast" BOOLEAN NOT NULL DEFAULT false, "lunch" BOOLEAN NOT NULL DEFAULT false, "dinner" BOOLEAN NOT NULL DEFAULT false, "content" TEXT, "accommodation" TEXT, "notes" TEXT, "displayOrder" INTEGER NOT NULL, CONSTRAINT "QuickTourProgramDay_pkey" PRIMARY KEY ("id"));
CREATE TABLE "QuickTourProgramItem" ("id" TEXT NOT NULL, "programId" TEXT NOT NULL, "type" TEXT NOT NULL, "content" TEXT NOT NULL, "displayOrder" INTEGER NOT NULL, CONSTRAINT "QuickTourProgramItem_pkey" PRIMARY KEY ("id"));
CREATE INDEX "QuickTourProgram_createdById_updatedAt_idx" ON "QuickTourProgram"("createdById", "updatedAt");
CREATE INDEX "QuickTourProgram_title_idx" ON "QuickTourProgram"("title");
CREATE INDEX "QuickTourProgram_tourCode_idx" ON "QuickTourProgram"("tourCode");
CREATE UNIQUE INDEX "QuickTourProgramDay_programId_displayOrder_key" ON "QuickTourProgramDay"("programId", "displayOrder");
CREATE UNIQUE INDEX "QuickTourProgramItem_programId_type_displayOrder_key" ON "QuickTourProgramItem"("programId", "type", "displayOrder");
ALTER TABLE "QuickTourProgramDay" ADD CONSTRAINT "QuickTourProgramDay_programId_fkey" FOREIGN KEY ("programId") REFERENCES "QuickTourProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuickTourProgramItem" ADD CONSTRAINT "QuickTourProgramItem_programId_fkey" FOREIGN KEY ("programId") REFERENCES "QuickTourProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

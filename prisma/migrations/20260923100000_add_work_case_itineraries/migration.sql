CREATE TABLE "WorkCaseItinerary" (
  "id" TEXT NOT NULL,
  "workCaseId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'ITINERARY',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdByType" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkCaseItinerary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkCaseItineraryDay" (
  "id" TEXT NOT NULL,
  "itineraryId" TEXT NOT NULL,
  "sourceItineraryDayId" TEXT,
  "dayNumber" INTEGER NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "transport" TEXT,
  "startLocation" TEXT,
  "endLocation" TEXT,
  "activityLocation" TEXT,
  "accommodation" TEXT,
  "breakfast" BOOLEAN NOT NULL DEFAULT false,
  "lunch" BOOLEAN NOT NULL DEFAULT false,
  "dinner" BOOLEAN NOT NULL DEFAULT false,
  "description" TEXT,
  "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkCaseItineraryDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkCaseItinerary_workCaseId_key" ON "WorkCaseItinerary"("workCaseId");
CREATE UNIQUE INDEX "WorkCaseItineraryDay_itineraryId_dayNumber_key" ON "WorkCaseItineraryDay"("itineraryId", "dayNumber");
CREATE INDEX "WorkCaseItineraryDay_itineraryId_dayNumber_idx" ON "WorkCaseItineraryDay"("itineraryId", "dayNumber");
CREATE INDEX "WorkCaseItineraryDay_sourceItineraryDayId_idx" ON "WorkCaseItineraryDay"("sourceItineraryDayId");
ALTER TABLE "WorkCaseItinerary" ADD CONSTRAINT "WorkCaseItinerary_workCaseId_fkey" FOREIGN KEY ("workCaseId") REFERENCES "WorkCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkCaseItineraryDay" ADD CONSTRAINT "WorkCaseItineraryDay_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "WorkCaseItinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkCaseItineraryDay" ADD CONSTRAINT "WorkCaseItineraryDay_sourceItineraryDayId_fkey" FOREIGN KEY ("sourceItineraryDayId") REFERENCES "ProductItineraryDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "QuickItinerary" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'ITINERARY',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "headerTemplateId" TEXT,
  "headerContent" TEXT,
  "headerMetadata" JSONB NOT NULL DEFAULT '{}',
  "headerImageFolderId" TEXT,
  "headerImageStoredName" TEXT,
  "headerImageMimeType" TEXT,
  "headerImageAlt" TEXT,
  "footerTemplateId" TEXT,
  "footerContent" TEXT,
  "footerMetadata" JSONB NOT NULL DEFAULT '{}',
  "footerImageFolderId" TEXT,
  "footerImageStoredName" TEXT,
  "footerImageMimeType" TEXT,
  "footerImageAlt" TEXT,
  "createdByType" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuickItinerary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuickItineraryDay" (
  "id" TEXT NOT NULL,
  "itineraryId" TEXT NOT NULL,
  "dayNumber" INTEGER NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "transport" TEXT,
  "tourGuide" BOOLEAN NOT NULL DEFAULT false,
  "startLocation" TEXT,
  "endLocation" TEXT,
  "activityLocation" TEXT,
  "accommodation" TEXT,
  "breakfast" BOOLEAN NOT NULL DEFAULT false,
  "lunch" BOOLEAN NOT NULL DEFAULT false,
  "dinner" BOOLEAN NOT NULL DEFAULT false,
  "description" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuickItineraryDay_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuickItinerary_createdById_updatedAt_idx" ON "QuickItinerary"("createdById", "updatedAt");
CREATE INDEX "QuickItinerary_headerTemplateId_idx" ON "QuickItinerary"("headerTemplateId");
CREATE INDEX "QuickItinerary_footerTemplateId_idx" ON "QuickItinerary"("footerTemplateId");
CREATE UNIQUE INDEX "QuickItineraryDay_itineraryId_dayNumber_key" ON "QuickItineraryDay"("itineraryId", "dayNumber");
CREATE INDEX "QuickItineraryDay_itineraryId_dayNumber_idx" ON "QuickItineraryDay"("itineraryId", "dayNumber");
ALTER TABLE "QuickItinerary" ADD CONSTRAINT "QuickItinerary_headerTemplateId_fkey" FOREIGN KEY ("headerTemplateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuickItinerary" ADD CONSTRAINT "QuickItinerary_footerTemplateId_fkey" FOREIGN KEY ("footerTemplateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuickItineraryDay" ADD CONSTRAINT "QuickItineraryDay_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "QuickItinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

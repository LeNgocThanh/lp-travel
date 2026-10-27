ALTER TABLE "WorkCaseItinerary"
ADD COLUMN "headerTemplateId" TEXT,
ADD COLUMN "headerContent" TEXT,
ADD COLUMN "headerMetadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "footerTemplateId" TEXT,
ADD COLUMN "footerContent" TEXT,
ADD COLUMN "footerMetadata" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "WorkCaseItinerary_headerTemplateId_idx" ON "WorkCaseItinerary"("headerTemplateId");
CREATE INDEX "WorkCaseItinerary_footerTemplateId_idx" ON "WorkCaseItinerary"("footerTemplateId");
ALTER TABLE "WorkCaseItinerary" ADD CONSTRAINT "WorkCaseItinerary_headerTemplateId_fkey" FOREIGN KEY ("headerTemplateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkCaseItinerary" ADD CONSTRAINT "WorkCaseItinerary_footerTemplateId_fkey" FOREIGN KEY ("footerTemplateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

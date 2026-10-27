CREATE TABLE "LeadConfirmation" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "numberOfGuests" TEXT,
  "numberOfRooms" TEXT,
  "nationality" TEXT,
  "guide" TEXT,
  "essentialTravelInfo" TEXT,
  "notes" TEXT,
  "createdByType" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadConfirmation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadConfirmationDay" (
  "id" TEXT NOT NULL,
  "confirmationId" TEXT NOT NULL,
  "dayNumber" INTEGER NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "itinerary" TEXT,
  "meals" TEXT,
  "transferGuide" TEXT,
  "hotelInformation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadConfirmationDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadConfirmation_leadId_key" ON "LeadConfirmation"("leadId");
CREATE INDEX "LeadConfirmation_createdById_updatedAt_idx" ON "LeadConfirmation"("createdById", "updatedAt");
CREATE UNIQUE INDEX "LeadConfirmationDay_confirmationId_dayNumber_key" ON "LeadConfirmationDay"("confirmationId", "dayNumber");
CREATE INDEX "LeadConfirmationDay_confirmationId_dayNumber_idx" ON "LeadConfirmationDay"("confirmationId", "dayNumber");

ALTER TABLE "LeadConfirmation" ADD CONSTRAINT "LeadConfirmation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadConfirmationDay" ADD CONSTRAINT "LeadConfirmationDay_confirmationId_fkey" FOREIGN KEY ("confirmationId") REFERENCES "LeadConfirmation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "B2BLead" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "dateReceived" TIMESTAMP(3) NOT NULL,
    "leadSource" TEXT DEFAULT 'B2B',
    "channel" TEXT,
    "campaign" TEXT,
    "customerName" TEXT NOT NULL,
    "country" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "preferredContact" TEXT,
    "email" TEXT,
    "travelDate" TIMESTAMP(3),
    "numberOfPax" INTEGER,
    "adults" INTEGER,
    "children" INTEGER,
    "destination" TEXT,
    "duration" TEXT,
    "travelType" TEXT,
    "hotel" TEXT,
    "category" TEXT,
    "meal" TEXT,
    "preference" TEXT,
    "specialRequest" TEXT,
    "budgetUsd" DECIMAL(14,2),
    "leadStatus" TEXT,
    "dateConfirmation" TIMESTAMP(3),
    "leadQuality" TEXT,
    "assignedToId" TEXT,
    "lastContact" TIMESTAMP(3),
    "nextFollowUp" TIMESTAMP(3),
    "quotationNo" TEXT,
    "quotationValueUsd" DECIMAL(14,2),
    "followUpStatus" TEXT,
    "bookingStatus" TEXT,
    "bookingValueUsd" DECIMAL(14,2),
    "paymentStatus" TEXT,
    "lostReason" TEXT,
    "remarks" TEXT,
    "createdByType" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "B2BLead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "B2BLead_leadId_key" ON "B2BLead"("leadId");
CREATE INDEX "B2BLead_dateReceived_idx" ON "B2BLead"("dateReceived");
CREATE INDEX "B2BLead_assignedToId_nextFollowUp_idx" ON "B2BLead"("assignedToId", "nextFollowUp");
CREATE INDEX "B2BLead_leadStatus_idx" ON "B2BLead"("leadStatus");
CREATE INDEX "B2BLead_dateConfirmation_idx" ON "B2BLead"("dateConfirmation");
ALTER TABLE "B2BLead" ADD CONSTRAINT "B2BLead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadInvoice" ALTER COLUMN "leadId" DROP NOT NULL;
ALTER TABLE "LeadInvoice" ADD COLUMN "b2bLeadId" TEXT;
CREATE UNIQUE INDEX "LeadInvoice_b2bLeadId_key" ON "LeadInvoice"("b2bLeadId");
ALTER TABLE "LeadInvoice" ADD CONSTRAINT "LeadInvoice_b2bLeadId_fkey" FOREIGN KEY ("b2bLeadId") REFERENCES "B2BLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuickItinerary" ADD COLUMN "b2bLeadId" TEXT;
CREATE UNIQUE INDEX "QuickItinerary_b2bLeadId_key" ON "QuickItinerary"("b2bLeadId");
ALTER TABLE "QuickItinerary" ADD CONSTRAINT "QuickItinerary_b2bLeadId_fkey" FOREIGN KEY ("b2bLeadId") REFERENCES "B2BLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

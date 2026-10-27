ALTER TABLE "LeadConfirmation" ALTER COLUMN "leadId" DROP NOT NULL;
ALTER TABLE "LeadConfirmation" ADD COLUMN "b2bLeadId" TEXT;

CREATE UNIQUE INDEX "LeadConfirmation_b2bLeadId_key" ON "LeadConfirmation"("b2bLeadId");

ALTER TABLE "LeadConfirmation" ADD CONSTRAINT "LeadConfirmation_b2bLeadId_fkey" FOREIGN KEY ("b2bLeadId") REFERENCES "B2BLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadConfirmation" ADD CONSTRAINT "LeadConfirmation_exactly_one_lead_check" CHECK (
  (CASE WHEN "leadId" IS NULL THEN 0 ELSE 1 END + CASE WHEN "b2bLeadId" IS NULL THEN 0 ELSE 1 END) = 1
);

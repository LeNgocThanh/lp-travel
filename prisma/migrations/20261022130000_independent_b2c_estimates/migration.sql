ALTER TABLE "InvoiceEstimate" ADD COLUMN "leadId" TEXT;

CREATE UNIQUE INDEX "InvoiceEstimate_leadId_key" ON "InvoiceEstimate"("leadId");

ALTER TABLE "InvoiceEstimate" ADD CONSTRAINT "InvoiceEstimate_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvoiceEstimate" DROP CONSTRAINT "InvoiceEstimate_exactly_one_owner_check";

UPDATE "InvoiceEstimate" estimate
SET "leadId" = invoice."leadId", "invoiceId" = NULL
FROM "LeadInvoice" invoice
WHERE estimate."invoiceId" = invoice."id" AND invoice."leadId" IS NOT NULL;

ALTER TABLE "InvoiceEstimate" ADD CONSTRAINT "InvoiceEstimate_exactly_one_owner_check" CHECK (
  (CASE WHEN "invoiceId" IS NULL THEN 0 ELSE 1 END + CASE WHEN "leadId" IS NULL THEN 0 ELSE 1 END + CASE WHEN "b2bLeadId" IS NULL THEN 0 ELSE 1 END) = 1
);

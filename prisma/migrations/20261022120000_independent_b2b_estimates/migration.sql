ALTER TABLE "InvoiceEstimate" ALTER COLUMN "invoiceId" DROP NOT NULL;
ALTER TABLE "InvoiceEstimate" ADD COLUMN "b2bLeadId" TEXT;

CREATE UNIQUE INDEX "InvoiceEstimate_b2bLeadId_key" ON "InvoiceEstimate"("b2bLeadId");

ALTER TABLE "InvoiceEstimate" ADD CONSTRAINT "InvoiceEstimate_b2bLeadId_fkey" FOREIGN KEY ("b2bLeadId") REFERENCES "B2BLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "InvoiceEstimate" estimate
SET "b2bLeadId" = invoice."b2bLeadId", "invoiceId" = NULL
FROM "LeadInvoice" invoice
WHERE estimate."invoiceId" = invoice."id" AND invoice."b2bLeadId" IS NOT NULL;

ALTER TABLE "InvoiceEstimate" ADD CONSTRAINT "InvoiceEstimate_exactly_one_owner_check" CHECK (
  (CASE WHEN "invoiceId" IS NULL THEN 0 ELSE 1 END + CASE WHEN "b2bLeadId" IS NULL THEN 0 ELSE 1 END) = 1
);

CREATE TABLE "LeadInvoicePaymentOption" (
  "invoiceId" TEXT NOT NULL,
  "paymentOptionId" TEXT,
  "name" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadInvoicePaymentOption_pkey" PRIMARY KEY ("invoiceId", "displayOrder")
);

INSERT INTO "LeadInvoicePaymentOption" ("invoiceId", "paymentOptionId", "name", "content", "displayOrder")
SELECT "id", "paymentOptionId", COALESCE("paymentOptionName", 'Payment Option'), "paymentOptionContent", 0
FROM "LeadInvoice"
WHERE "paymentOptionContent" IS NOT NULL;

CREATE INDEX "LeadInvoicePaymentOption_paymentOptionId_idx" ON "LeadInvoicePaymentOption"("paymentOptionId");
ALTER TABLE "LeadInvoicePaymentOption" ADD CONSTRAINT "LeadInvoicePaymentOption_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "LeadInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadInvoicePaymentOption" ADD CONSTRAINT "LeadInvoicePaymentOption_paymentOptionId_fkey" FOREIGN KEY ("paymentOptionId") REFERENCES "InvoicePaymentOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadInvoice" DROP CONSTRAINT "LeadInvoice_paymentOptionId_fkey";
DROP INDEX "LeadInvoice_paymentOptionId_idx";
ALTER TABLE "LeadInvoice" DROP COLUMN "paymentOptionId", DROP COLUMN "paymentOptionName", DROP COLUMN "paymentOptionContent";

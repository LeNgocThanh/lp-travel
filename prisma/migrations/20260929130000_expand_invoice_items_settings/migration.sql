ALTER TABLE "LeadInvoice"
  ADD COLUMN "depositPercent" DECIMAL(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN "depositDueDays" INTEGER NOT NULL DEFAULT 50;

CREATE TABLE "LeadInvoiceItem" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'Pax',
  "pricePerPaxUsd" DECIMAL(14,2) NOT NULL,
  "amountUsd" DECIMAL(14,2) NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadInvoiceItem_pkey" PRIMARY KEY ("id")
);

INSERT INTO "LeadInvoiceItem" ("id", "invoiceId", "description", "quantity", "unit", "pricePerPaxUsd", "amountUsd", "displayOrder")
SELECT 'invoice-item-' || "id", "id", "description", "quantity", "unit", "pricePerPaxUsd", "amountUsd", 0 FROM "LeadInvoice";

CREATE UNIQUE INDEX "LeadInvoiceItem_invoiceId_displayOrder_key" ON "LeadInvoiceItem"("invoiceId", "displayOrder");
CREATE INDEX "LeadInvoiceItem_invoiceId_idx" ON "LeadInvoiceItem"("invoiceId");
ALTER TABLE "LeadInvoiceItem" ADD CONSTRAINT "LeadInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "LeadInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "InvoiceSetting" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "depositPercent" DECIMAL(5,2) NOT NULL DEFAULT 50,
  "depositDueDays" INTEGER NOT NULL DEFAULT 50,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoiceSetting_pkey" PRIMARY KEY ("id")
);
INSERT INTO "InvoiceSetting" ("id", "depositPercent", "depositDueDays", "updatedAt") VALUES ('default', 50, 50, CURRENT_TIMESTAMP);

ALTER TABLE "LeadInvoice"
  DROP COLUMN "description",
  DROP COLUMN "quantity",
  DROP COLUMN "unit",
  DROP COLUMN "pricePerPaxUsd";

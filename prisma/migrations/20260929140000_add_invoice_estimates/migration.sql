CREATE TABLE "InvoiceEstimate" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "createdByType" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoiceEstimate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceEstimateCostItem" (
  "id" TEXT NOT NULL,
  "estimateId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "unitPriceVnd" DECIMAL(18,2) NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL,
  "amountVnd" DECIMAL(18,2) NOT NULL,
  "vatVnd" DECIMAL(18,2) NOT NULL,
  "note" TEXT,
  "displayOrder" INTEGER NOT NULL,
  CONSTRAINT "InvoiceEstimateCostItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceEstimateRevenueItem" (
  "id" TEXT NOT NULL,
  "estimateId" TEXT NOT NULL,
  "settlementType" TEXT NOT NULL DEFAULT 'Tour',
  "category" TEXT NOT NULL,
  "unitPriceUsd" DECIMAL(14,2) NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL,
  "amountUsd" DECIMAL(14,2) NOT NULL,
  "amountVnd" DECIMAL(18,2) NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  CONSTRAINT "InvoiceEstimateRevenueItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoiceEstimate_invoiceId_key" ON "InvoiceEstimate"("invoiceId");
CREATE UNIQUE INDEX "InvoiceEstimateCostItem_estimateId_displayOrder_key" ON "InvoiceEstimateCostItem"("estimateId", "displayOrder");
CREATE INDEX "InvoiceEstimateCostItem_estimateId_idx" ON "InvoiceEstimateCostItem"("estimateId");
CREATE UNIQUE INDEX "InvoiceEstimateRevenueItem_estimateId_displayOrder_key" ON "InvoiceEstimateRevenueItem"("estimateId", "displayOrder");
CREATE INDEX "InvoiceEstimateRevenueItem_estimateId_idx" ON "InvoiceEstimateRevenueItem"("estimateId");

ALTER TABLE "InvoiceEstimate" ADD CONSTRAINT "InvoiceEstimate_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "LeadInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceEstimateCostItem" ADD CONSTRAINT "InvoiceEstimateCostItem_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "InvoiceEstimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceEstimateRevenueItem" ADD CONSTRAINT "InvoiceEstimateRevenueItem_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "InvoiceEstimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

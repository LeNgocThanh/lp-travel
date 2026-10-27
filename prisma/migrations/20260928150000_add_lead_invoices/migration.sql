CREATE TABLE "InvoicePaymentOption" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoicePaymentOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoicePaymentOption_code_key" ON "InvoicePaymentOption"("code");
CREATE INDEX "InvoicePaymentOption_active_name_idx" ON "InvoicePaymentOption"("active", "name");

CREATE TABLE "LeadInvoice" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "billTo" TEXT NOT NULL,
  "contact" TEXT,
  "email" TEXT,
  "bookingCode" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3),
  "issuerName" TEXT NOT NULL,
  "issuerContact" TEXT,
  "issuerEmail" TEXT,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'Pax',
  "amountUsd" DECIMAL(14,2) NOT NULL,
  "pricePerPaxUsd" DECIMAL(14,2) NOT NULL,
  "depositAmountUsd" DECIMAL(14,2) NOT NULL,
  "depositDueDate" TIMESTAMP(3),
  "balanceAmountUsd" DECIMAL(14,2) NOT NULL,
  "balanceDueDate" TIMESTAMP(3),
  "paymentOptionId" TEXT,
  "paymentOptionName" TEXT,
  "paymentOptionContent" TEXT,
  "headerTemplateId" TEXT,
  "headerContent" TEXT,
  "headerImageFolderId" TEXT,
  "headerImageStoredName" TEXT,
  "headerImageMimeType" TEXT,
  "headerImageAlt" TEXT,
  "footerTemplateId" TEXT,
  "footerContent" TEXT,
  "footerImageFolderId" TEXT,
  "footerImageStoredName" TEXT,
  "footerImageMimeType" TEXT,
  "footerImageAlt" TEXT,
  "createdByType" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadInvoice_leadId_key" ON "LeadInvoice"("leadId");
CREATE UNIQUE INDEX "LeadInvoice_invoiceNumber_key" ON "LeadInvoice"("invoiceNumber");
CREATE INDEX "LeadInvoice_invoiceNumber_idx" ON "LeadInvoice"("invoiceNumber");
CREATE INDEX "LeadInvoice_paymentOptionId_idx" ON "LeadInvoice"("paymentOptionId");
ALTER TABLE "LeadInvoice" ADD CONSTRAINT "LeadInvoice_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadInvoice" ADD CONSTRAINT "LeadInvoice_paymentOptionId_fkey" FOREIGN KEY ("paymentOptionId") REFERENCES "InvoicePaymentOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "InvoicePaymentOption" ("id", "code", "name", "content", "updatedAt") VALUES
('invoice-payment-credit-card', 'CREDIT_CARD', 'Secure Online Payment via Credit Card', E'Option 1: Secure Online Payment via Credit Card - Plus 3.5% transaction fee\n(Vietnamese Dong Only)\nhttps://checkout.onepay.vn/mylink/lapassiontravel', CURRENT_TIMESTAMP),
('invoice-payment-bank-transfer', 'BANK_TRANSFER', 'Bank Transfer', E'Option 2: Bank Transfer\nBeneficiary Name: LA PASSION TRAVEL COMPANY LIMITED\nAccount Number: 66668888698\nCompany Address: 6th Floor, 214B Tran Quang Khai, Hoan Kiem, Ha Noi\nBeneficiary Bank: TIEN PHONG COMMERCIAL JOINT STOCK BANK (TPBank)\nSWIFT/BIC: TPBVVNVX\nBank Address: Hanoi, Vietnam', CURRENT_TIMESTAMP);

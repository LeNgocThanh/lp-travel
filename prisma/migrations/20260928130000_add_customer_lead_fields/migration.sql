ALTER TABLE "Customer"
  ADD COLUMN "whatsapp" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "dateReceived" TIMESTAMP(3);

CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX "Customer_whatsapp_idx" ON "Customer"("whatsapp");
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

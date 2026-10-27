CREATE TABLE "SupplierAddress" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "label" TEXT,
  "address" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplierAddress_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SupplierPhone" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "label" TEXT,
  "phone" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplierPhone_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupplierAddress_supplierId_isPrimary_idx" ON "SupplierAddress"("supplierId", "isPrimary");
CREATE UNIQUE INDEX "SupplierPhone_supplierId_phone_key" ON "SupplierPhone"("supplierId", "phone");
CREATE INDEX "SupplierPhone_supplierId_isPrimary_idx" ON "SupplierPhone"("supplierId", "isPrimary");
ALTER TABLE "SupplierAddress" ADD CONSTRAINT "SupplierAddress_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierPhone" ADD CONSTRAINT "SupplierPhone_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "SupplierPhone" ("id", "supplierId", "label", "phone", "isPrimary", "createdAt", "updatedAt") SELECT md5(random()::text || clock_timestamp()::text || "id"), "id", 'Số chính', "phone", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Supplier" WHERE "phone" IS NOT NULL AND btrim("phone") <> '';

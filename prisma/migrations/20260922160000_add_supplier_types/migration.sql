ALTER TABLE "Supplier" ADD COLUMN "supplierTypeId" TEXT;
CREATE TABLE "SupplierType" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplierType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupplierType_code_key" ON "SupplierType"("code");
CREATE UNIQUE INDEX "SupplierType_name_key" ON "SupplierType"("name");
CREATE INDEX "Supplier_supplierTypeId_idx" ON "Supplier"("supplierTypeId");
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_supplierTypeId_fkey" FOREIGN KEY ("supplierTypeId") REFERENCES "SupplierType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

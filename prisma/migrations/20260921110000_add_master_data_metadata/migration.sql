ALTER TABLE "Customer" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "Supplier" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "Product" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb;

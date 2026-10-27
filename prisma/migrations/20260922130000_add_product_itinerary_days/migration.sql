CREATE TABLE "ProductItineraryDay" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "dayNumber" INTEGER NOT NULL,
  "title" TEXT,
  "startLocation" TEXT,
  "endLocation" TEXT,
  "accommodation" TEXT,
  "breakfast" BOOLEAN NOT NULL DEFAULT false,
  "lunch" BOOLEAN NOT NULL DEFAULT false,
  "dinner" BOOLEAN NOT NULL DEFAULT false,
  "description" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductItineraryDay_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductItineraryDay_productId_dayNumber_key" ON "ProductItineraryDay"("productId", "dayNumber");
CREATE INDEX "ProductItineraryDay_productId_dayNumber_idx" ON "ProductItineraryDay"("productId", "dayNumber");
ALTER TABLE "ProductItineraryDay" ADD CONSTRAINT "ProductItineraryDay_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

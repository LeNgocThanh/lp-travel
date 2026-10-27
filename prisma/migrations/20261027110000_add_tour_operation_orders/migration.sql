CREATE TABLE "TourOperationOrder" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyAddress" TEXT NOT NULL,
    "companyPhone" TEXT,
    "companyTaxCode" TEXT NOT NULL,
    "tourCode" TEXT NOT NULL,
    "guestCount" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "tourName" TEXT NOT NULL,
    "tourGuideNames" TEXT,
    "operatorName" TEXT,
    "operatorTitle" TEXT,
    "decisionText" TEXT NOT NULL,
    "createdByType" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "updatedByType" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourOperationOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TourOperationOrder_itineraryId_key" ON "TourOperationOrder"("itineraryId");
CREATE INDEX "TourOperationOrder_tourCode_idx" ON "TourOperationOrder"("tourCode");
CREATE INDEX "TourOperationOrder_createdById_updatedAt_idx" ON "TourOperationOrder"("createdById", "updatedAt");

ALTER TABLE "TourOperationOrder" ADD CONSTRAINT "TourOperationOrder_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "QuickItinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

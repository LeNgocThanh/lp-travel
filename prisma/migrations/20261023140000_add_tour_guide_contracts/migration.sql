CREATE TABLE "TourGuideContract" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "tourGuideId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "contractDate" TIMESTAMP(3) NOT NULL,
    "serviceStartDate" TIMESTAMP(3) NOT NULL,
    "serviceEndDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT,
    "signerUserId" TEXT,
    "signerName" TEXT NOT NULL,
    "signerTitle" TEXT NOT NULL,
    "authorizationNumber" TEXT,
    "dailyRateVnd" DECIMAL(18,2) NOT NULL,
    "workingDayCount" INTEGER NOT NULL,
    "totalAmountVnd" DECIMAL(18,2) NOT NULL,
    "advanceAmountVnd" DECIMAL(18,2) NOT NULL,
    "journeyContent" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyTaxCode" TEXT NOT NULL,
    "companyAddress" TEXT NOT NULL,
    "legalRepresentative" TEXT NOT NULL,
    "legalRepresentativeTitle" TEXT NOT NULL,
    "companyBankName" TEXT NOT NULL,
    "companyBankAccountNumber" TEXT NOT NULL,
    "signingPlace" TEXT NOT NULL,
    "contractCopies" INTEGER NOT NULL,
    "guideName" TEXT NOT NULL,
    "guideGender" TEXT NOT NULL,
    "guideDateOfBirth" TIMESTAMP(3),
    "guideIdentityNumber" TEXT NOT NULL,
    "guidePermanentAddress" TEXT,
    "guideTaxCode" TEXT,
    "guidePhone" TEXT NOT NULL,
    "guideAccountName" TEXT,
    "guideBankAccountNumber" TEXT,
    "guideBankName" TEXT,
    "article4" TEXT,
    "article5" TEXT,
    "article6" TEXT,
    "article7" TEXT,
    "createdByType" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TourGuideContract_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TourGuideContractDay" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "itineraryDayId" TEXT,
    "dayNumber" INTEGER NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    CONSTRAINT "TourGuideContractDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TourGuideContract_itineraryId_tourGuideId_key" ON "TourGuideContract"("itineraryId", "tourGuideId");
CREATE INDEX "TourGuideContract_tourGuideId_idx" ON "TourGuideContract"("tourGuideId");
CREATE INDEX "TourGuideContract_signerUserId_idx" ON "TourGuideContract"("signerUserId");
CREATE UNIQUE INDEX "TourGuideContractDay_contractId_displayOrder_key" ON "TourGuideContractDay"("contractId", "displayOrder");
CREATE INDEX "TourGuideContractDay_itineraryDayId_idx" ON "TourGuideContractDay"("itineraryDayId");

ALTER TABLE "TourGuideContract" ADD CONSTRAINT "TourGuideContract_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "QuickItinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TourGuideContract" ADD CONSTRAINT "TourGuideContract_tourGuideId_fkey" FOREIGN KEY ("tourGuideId") REFERENCES "TourGuide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TourGuideContract" ADD CONSTRAINT "TourGuideContract_signerUserId_fkey" FOREIGN KEY ("signerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TourGuideContractDay" ADD CONSTRAINT "TourGuideContractDay_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "TourGuideContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TourGuideContractDay" ADD CONSTRAINT "TourGuideContractDay_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "QuickItineraryDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TourGuide" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "gender" TEXT NOT NULL,
  "dateOfBirth" TIMESTAMP(3),
  "identityNumber" TEXT NOT NULL,
  "permanentAddress" TEXT,
  "taxCode" TEXT,
  "phone" TEXT NOT NULL,
  "accountName" TEXT,
  "bankAccountNumber" TEXT,
  "bankName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TourGuide_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TourGuide_identityNumber_key" ON "TourGuide"("identityNumber");
CREATE INDEX "TourGuide_fullName_idx" ON "TourGuide"("fullName");
CREATE INDEX "TourGuide_phone_idx" ON "TourGuide"("phone");

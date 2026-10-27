CREATE TABLE "Country" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");
CREATE INDEX "Country_active_name_idx" ON "Country"("active", "name");

CREATE TABLE "LeadSource" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LeadSource_code_key" ON "LeadSource"("code");
CREATE UNIQUE INDEX "LeadSource_name_key" ON "LeadSource"("name");
CREATE INDEX "LeadSource_active_name_idx" ON "LeadSource"("active", "name");

CREATE TABLE "TravelType" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TravelType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TravelType_code_key" ON "TravelType"("code");
CREATE UNIQUE INDEX "TravelType_name_key" ON "TravelType"("name");
CREATE INDEX "TravelType_active_name_idx" ON "TravelType"("active", "name");

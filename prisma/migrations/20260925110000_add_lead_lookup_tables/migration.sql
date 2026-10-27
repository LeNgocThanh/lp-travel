CREATE TABLE "LeadStatus" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "metadata" JSONB NOT NULL DEFAULT '{}', "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LeadStatus_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "LeadStatus_code_key" ON "LeadStatus"("code");
CREATE UNIQUE INDEX "LeadStatus_name_key" ON "LeadStatus"("name");
CREATE INDEX "LeadStatus_active_name_idx" ON "LeadStatus"("active", "name");

CREATE TABLE "LeadQuality" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "metadata" JSONB NOT NULL DEFAULT '{}', "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LeadQuality_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "LeadQuality_code_key" ON "LeadQuality"("code");
CREATE UNIQUE INDEX "LeadQuality_name_key" ON "LeadQuality"("name");
CREATE INDEX "LeadQuality_active_name_idx" ON "LeadQuality"("active", "name");

CREATE TABLE "PreferredContact" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "metadata" JSONB NOT NULL DEFAULT '{}', "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PreferredContact_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "PreferredContact_code_key" ON "PreferredContact"("code");
CREATE UNIQUE INDEX "PreferredContact_name_key" ON "PreferredContact"("name");
CREATE INDEX "PreferredContact_active_name_idx" ON "PreferredContact"("active", "name");

CREATE TABLE "HotelCategory" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "metadata" JSONB NOT NULL DEFAULT '{}', "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "HotelCategory_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "HotelCategory_code_key" ON "HotelCategory"("code");
CREATE UNIQUE INDEX "HotelCategory_name_key" ON "HotelCategory"("name");
CREATE INDEX "HotelCategory_active_name_idx" ON "HotelCategory"("active", "name");

CREATE TABLE "LeadBookingStatus" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "metadata" JSONB NOT NULL DEFAULT '{}', "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LeadBookingStatus_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "LeadBookingStatus_code_key" ON "LeadBookingStatus"("code");
CREATE UNIQUE INDEX "LeadBookingStatus_name_key" ON "LeadBookingStatus"("name");
CREATE INDEX "LeadBookingStatus_active_name_idx" ON "LeadBookingStatus"("active", "name");

CREATE TABLE "PaymentStatus" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "metadata" JSONB NOT NULL DEFAULT '{}', "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PaymentStatus_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "PaymentStatus_code_key" ON "PaymentStatus"("code");
CREATE UNIQUE INDEX "PaymentStatus_name_key" ON "PaymentStatus"("name");
CREATE INDEX "PaymentStatus_active_name_idx" ON "PaymentStatus"("active", "name");

CREATE TABLE "FollowUpStatus" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "metadata" JSONB NOT NULL DEFAULT '{}', "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "FollowUpStatus_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "FollowUpStatus_code_key" ON "FollowUpStatus"("code");
CREATE UNIQUE INDEX "FollowUpStatus_name_key" ON "FollowUpStatus"("name");
CREATE INDEX "FollowUpStatus_active_name_idx" ON "FollowUpStatus"("active", "name");

CREATE TABLE "LostReason" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "metadata" JSONB NOT NULL DEFAULT '{}', "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LostReason_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "LostReason_code_key" ON "LostReason"("code");
CREATE UNIQUE INDEX "LostReason_name_key" ON "LostReason"("name");
CREATE INDEX "LostReason_active_name_idx" ON "LostReason"("active", "name");

CREATE TABLE "MealPreference" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "metadata" JSONB NOT NULL DEFAULT '{}', "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "MealPreference_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "MealPreference_code_key" ON "MealPreference"("code");
CREATE UNIQUE INDEX "MealPreference_name_key" ON "MealPreference"("name");
CREATE INDEX "MealPreference_active_name_idx" ON "MealPreference"("active", "name");

ALTER TABLE "Lead" ADD COLUMN "preferredContact" TEXT;
UPDATE "LeadFieldConfig" SET "label" = 'Hotel Category', "updatedAt" = CURRENT_TIMESTAMP WHERE "fieldKey" = 'category';
UPDATE "LeadFieldConfig" SET "label" = 'Meal Preference', "updatedAt" = CURRENT_TIMESTAMP WHERE "fieldKey" = 'meal';
INSERT INTO "LeadFieldConfig" ("id", "fieldKey", "label", "displayOrder", "updatedAt") VALUES ('lead-field-preferred-contact', 'preferredContact', 'Preferred Contact', 37, CURRENT_TIMESTAMP);

ALTER TABLE "Lead" ADD COLUMN "dateConfirmation" TIMESTAMP(3);
CREATE INDEX "Lead_dateConfirmation_idx" ON "Lead"("dateConfirmation");

UPDATE "LeadFieldConfig" SET "displayOrder" = "displayOrder" + 1 WHERE "displayOrder" >= 25;
INSERT INTO "LeadFieldConfig" ("id", "fieldKey", "label", "displayOrder", "groupCode", "updatedAt")
VALUES ('lead-field-date-confirmation', 'dateConfirmation', 'Date Confirmation', 25, 'BASIC', CURRENT_TIMESTAMP);

INSERT INTO "LeadFieldRolePermission" ("fieldConfigId", "systemRoleId", "canRead", "canWrite", "updatedAt")
SELECT 'lead-field-date-confirmation', r."id", true, true, CURRENT_TIMESTAMP
FROM "SystemRole" r;

UPDATE "Lead" SET "leadStatus" = 'Confirmed' WHERE "dateConfirmation" IS NOT NULL;

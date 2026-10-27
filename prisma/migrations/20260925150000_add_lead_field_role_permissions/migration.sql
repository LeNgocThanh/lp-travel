ALTER TABLE "LeadFieldConfig" ADD COLUMN "groupCode" TEXT NOT NULL DEFAULT 'BASIC';
UPDATE "LeadFieldConfig" SET "groupCode" = 'MARKETING' WHERE "fieldKey" IN ('leadSource','channel','campaign','country','leadQuality');
UPDATE "LeadFieldConfig" SET "groupCode" = 'CONTACT' WHERE "fieldKey" IN ('phone','whatsapp','preferredContact','email');
UPDATE "LeadFieldConfig" SET "groupCode" = 'TRAVEL' WHERE "fieldKey" IN ('travelDate','numberOfPax','adults','children','destination','duration','travelType','hotel','category','meal','preference','specialRequest');
UPDATE "LeadFieldConfig" SET "groupCode" = 'FINANCE' WHERE "fieldKey" IN ('budgetUsd','quotationNo','quotationValueUsd','bookingValueUsd','paymentStatus');
UPDATE "LeadFieldConfig" SET "groupCode" = 'ASSIGNMENT' WHERE "fieldKey" IN ('assignedToId','lastContact','nextFollowUp','followUpStatus');
UPDATE "LeadFieldConfig" SET "groupCode" = 'INTERNAL' WHERE "fieldKey" IN ('bookingStatus','lostReason','remarks');

CREATE TABLE "LeadFieldRolePermission" (
  "fieldConfigId" TEXT NOT NULL,
  "systemRoleId" TEXT NOT NULL,
  "canRead" BOOLEAN NOT NULL DEFAULT false,
  "canWrite" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadFieldRolePermission_pkey" PRIMARY KEY ("fieldConfigId", "systemRoleId")
);
CREATE INDEX "LeadFieldRolePermission_systemRoleId_idx" ON "LeadFieldRolePermission"("systemRoleId");
ALTER TABLE "LeadFieldRolePermission" ADD CONSTRAINT "LeadFieldRolePermission_fieldConfigId_fkey" FOREIGN KEY ("fieldConfigId") REFERENCES "LeadFieldConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadFieldRolePermission" ADD CONSTRAINT "LeadFieldRolePermission_systemRoleId_fkey" FOREIGN KEY ("systemRoleId") REFERENCES "SystemRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "LeadFieldRolePermission" ("fieldConfigId", "systemRoleId", "canRead", "canWrite", "updatedAt")
SELECT f."id", r."id", true, true, CURRENT_TIMESTAMP FROM "LeadFieldConfig" f CROSS JOIN "SystemRole" r;

INSERT INTO "AccessResource" ("id", "code", "name", "description", "updatedAt") VALUES
  ('access-resource-leads', 'LEADS', 'Lead', 'Bảng dữ liệu Lead du lịch.', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
INSERT INTO "BasePermission" ("id", "code", "name", "description", "updatedAt") VALUES
  ('base-permission-import', 'IMPORT', 'Import', 'Cho phép import dữ liệu.', CURRENT_TIMESTAMP),
  ('base-permission-export', 'EXPORT', 'Export', 'Cho phép xuất dữ liệu.', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
INSERT INTO "ResourcePermission" ("id", "name", "resourceId", "basePermissionId", "updatedAt")
SELECT 'lead-resource-' || lower(p."code"),
       CASE p."code" WHEN 'CREATE' THEN 'Tạo Lead' WHEN 'READ' THEN 'Xem Lead' WHEN 'UPDATE' THEN 'Sửa Lead' WHEN 'DELETE' THEN 'Xóa Lead' WHEN 'IMPORT' THEN 'Import Lead' ELSE 'Export Lead' END,
       r."id", p."id", CURRENT_TIMESTAMP
FROM "AccessResource" r CROSS JOIN "BasePermission" p
WHERE r."code" = 'LEADS' AND p."code" IN ('CREATE','READ','UPDATE','DELETE','IMPORT','EXPORT')
ON CONFLICT ("resourceId", "basePermissionId") DO NOTHING;
INSERT INTO "DepartmentMembershipResourcePermission" ("membershipId", "resourcePermissionId")
SELECT m."id", rp."id" FROM "DepartmentMembership" m CROSS JOIN "ResourcePermission" rp
JOIN "AccessResource" r ON r."id" = rp."resourceId" WHERE r."code" = 'LEADS'
ON CONFLICT DO NOTHING;

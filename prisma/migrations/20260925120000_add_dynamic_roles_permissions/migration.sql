CREATE TABLE "SystemRole" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT,
  "isSystemAdmin" BOOLEAN NOT NULL DEFAULT false, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemRole_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SystemRole_code_key" ON "SystemRole"("code");
CREATE UNIQUE INDEX "SystemRole_name_key" ON "SystemRole"("name");
CREATE INDEX "SystemRole_active_name_idx" ON "SystemRole"("active", "name");
INSERT INTO "SystemRole" ("id", "code", "name", "description", "isSystemAdmin", "updatedAt") VALUES
  ('system-role-admin', 'ADMIN', 'Quản trị viên', 'Toàn quyền hệ thống.', true, CURRENT_TIMESTAMP),
  ('system-role-user', 'USER', 'Nhân viên', 'Vai trò người dùng thông thường.', false, CURRENT_TIMESTAMP);
ALTER TABLE "User" ADD COLUMN "systemRoleId" TEXT;
UPDATE "User" SET "systemRoleId" = CASE WHEN "role" = 'ADMIN' THEN 'system-role-admin' ELSE 'system-role-user' END;
ALTER TABLE "User" ALTER COLUMN "systemRoleId" SET NOT NULL;
CREATE INDEX "User_systemRoleId_idx" ON "User"("systemRoleId");
ALTER TABLE "User" ADD CONSTRAINT "User_systemRoleId_fkey" FOREIGN KEY ("systemRoleId") REFERENCES "SystemRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DepartmentPermissionDefinition" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DepartmentPermissionDefinition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DepartmentPermissionDefinition_code_key" ON "DepartmentPermissionDefinition"("code");
CREATE UNIQUE INDEX "DepartmentPermissionDefinition_name_key" ON "DepartmentPermissionDefinition"("name");
CREATE INDEX "DepartmentPermissionDefinition_active_name_idx" ON "DepartmentPermissionDefinition"("active", "name");
INSERT INTO "DepartmentPermissionDefinition" ("id", "code", "name", "updatedAt") VALUES
  ('dept-perm-manage-members', 'canManageMembers', 'Quản lý thành viên', CURRENT_TIMESTAMP),
  ('dept-perm-manage-work-cases', 'canManageWorkCases', 'Quản lý hồ sơ việc', CURRENT_TIMESTAMP),
  ('dept-perm-assign-tasks', 'canAssignTasks', 'Giao việc', CURRENT_TIMESTAMP),
  ('dept-perm-manage-bookings', 'canManageBookings', 'Quản lý booking', CURRENT_TIMESTAMP),
  ('dept-perm-view-reports', 'canViewReports', 'Xem báo cáo', CURRENT_TIMESTAMP),
  ('dept-perm-view-customers', 'canViewCustomers', 'Xem khách hàng CRM', CURRENT_TIMESTAMP),
  ('dept-perm-manage-customers', 'canManageCustomers', 'Quản lý khách hàng CRM', CURRENT_TIMESTAMP);
CREATE TABLE "DepartmentMembershipPermission" (
  "membershipId" TEXT NOT NULL, "permissionId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DepartmentMembershipPermission_pkey" PRIMARY KEY ("membershipId", "permissionId")
);
CREATE INDEX "DepartmentMembershipPermission_permissionId_idx" ON "DepartmentMembershipPermission"("permissionId");
ALTER TABLE "DepartmentMembershipPermission" ADD CONSTRAINT "DepartmentMembershipPermission_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "DepartmentMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepartmentMembershipPermission" ADD CONSTRAINT "DepartmentMembershipPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "DepartmentPermissionDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "DepartmentMembershipPermission" ("membershipId", "permissionId") SELECT "id", 'dept-perm-manage-members' FROM "DepartmentMembership" WHERE "canManageMembers" = true;
INSERT INTO "DepartmentMembershipPermission" ("membershipId", "permissionId") SELECT "id", 'dept-perm-manage-work-cases' FROM "DepartmentMembership" WHERE "canManageWorkCases" = true;
INSERT INTO "DepartmentMembershipPermission" ("membershipId", "permissionId") SELECT "id", 'dept-perm-assign-tasks' FROM "DepartmentMembership" WHERE "canAssignTasks" = true;
INSERT INTO "DepartmentMembershipPermission" ("membershipId", "permissionId") SELECT "id", 'dept-perm-manage-bookings' FROM "DepartmentMembership" WHERE "canManageBookings" = true;
INSERT INTO "DepartmentMembershipPermission" ("membershipId", "permissionId") SELECT "id", 'dept-perm-view-reports' FROM "DepartmentMembership" WHERE "canViewReports" = true;
INSERT INTO "DepartmentMembershipPermission" ("membershipId", "permissionId") SELECT "id", 'dept-perm-view-customers' FROM "DepartmentMembership" WHERE "canViewCustomers" = true;
INSERT INTO "DepartmentMembershipPermission" ("membershipId", "permissionId") SELECT "id", 'dept-perm-manage-customers' FROM "DepartmentMembership" WHERE "canManageCustomers" = true;

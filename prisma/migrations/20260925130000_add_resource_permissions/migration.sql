CREATE TABLE "AccessResource" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccessResource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccessResource_code_key" ON "AccessResource"("code");
CREATE UNIQUE INDEX "AccessResource_name_key" ON "AccessResource"("name");
CREATE INDEX "AccessResource_active_name_idx" ON "AccessResource"("active", "name");

CREATE TABLE "BasePermission" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BasePermission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BasePermission_code_key" ON "BasePermission"("code");
CREATE UNIQUE INDEX "BasePermission_name_key" ON "BasePermission"("name");
CREATE INDEX "BasePermission_active_name_idx" ON "BasePermission"("active", "name");

CREATE TABLE "ResourcePermission" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "basePermissionId" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResourcePermission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ResourcePermission_resourceId_basePermissionId_key" ON "ResourcePermission"("resourceId", "basePermissionId");
CREATE INDEX "ResourcePermission_active_idx" ON "ResourcePermission"("active");
CREATE INDEX "ResourcePermission_basePermissionId_idx" ON "ResourcePermission"("basePermissionId");
ALTER TABLE "ResourcePermission" ADD CONSTRAINT "ResourcePermission_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "AccessResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResourcePermission" ADD CONSTRAINT "ResourcePermission_basePermissionId_fkey" FOREIGN KEY ("basePermissionId") REFERENCES "BasePermission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "BasePermission" ("id", "code", "name", "description", "updatedAt") VALUES
  ('base-permission-create', 'CREATE', 'Tạo mới', 'Cho phép tạo dữ liệu mới.', CURRENT_TIMESTAMP),
  ('base-permission-read', 'READ', 'Xem', 'Cho phép xem dữ liệu.', CURRENT_TIMESTAMP),
  ('base-permission-update', 'UPDATE', 'Cập nhật', 'Cho phép chỉnh sửa dữ liệu.', CURRENT_TIMESTAMP),
  ('base-permission-delete', 'DELETE', 'Xóa', 'Cho phép xóa dữ liệu.', CURRENT_TIMESTAMP);

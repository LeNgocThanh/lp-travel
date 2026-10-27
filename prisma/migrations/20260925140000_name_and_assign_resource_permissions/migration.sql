ALTER TABLE "ResourcePermission" ADD COLUMN "name" TEXT;
UPDATE "ResourcePermission" rp
SET "name" = r."name" || ' - ' || p."name"
FROM "AccessResource" r, "BasePermission" p
WHERE rp."resourceId" = r."id" AND rp."basePermissionId" = p."id";
ALTER TABLE "ResourcePermission" ALTER COLUMN "name" SET NOT NULL;
CREATE UNIQUE INDEX "ResourcePermission_name_key" ON "ResourcePermission"("name");

CREATE TABLE "DepartmentMembershipResourcePermission" (
  "membershipId" TEXT NOT NULL,
  "resourcePermissionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DepartmentMembershipResourcePermission_pkey" PRIMARY KEY ("membershipId", "resourcePermissionId")
);
CREATE INDEX "DepartmentMembershipResourcePermission_resourcePermissionId_idx" ON "DepartmentMembershipResourcePermission"("resourcePermissionId");
ALTER TABLE "DepartmentMembershipResourcePermission" ADD CONSTRAINT "DepartmentMembershipResourcePermission_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "DepartmentMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepartmentMembershipResourcePermission" ADD CONSTRAINT "DepartmentMembershipResourcePermission_resourcePermissionId_fkey" FOREIGN KEY ("resourcePermissionId") REFERENCES "ResourcePermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

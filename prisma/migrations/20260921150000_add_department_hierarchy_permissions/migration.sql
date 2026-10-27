ALTER TABLE "Department" ADD COLUMN "parentId" TEXT;
ALTER TABLE "DepartmentMembership"
  ADD COLUMN "canManageMembers" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canManageWorkCases" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canAssignTasks" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canManageBookings" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canViewReports" BOOLEAN NOT NULL DEFAULT false;
UPDATE "DepartmentMembership" SET
  "canManageMembers" = true,
  "canManageWorkCases" = true,
  "canAssignTasks" = true,
  "canManageBookings" = true,
  "canViewReports" = true
WHERE "role" = 'MANAGER';
CREATE INDEX "Department_parentId_idx" ON "Department"("parentId");
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

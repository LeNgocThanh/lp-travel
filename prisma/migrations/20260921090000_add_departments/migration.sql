CREATE TYPE "DepartmentRole" AS ENUM ('MANAGER', 'MEMBER');

CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DepartmentMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "role" "DepartmentRole" NOT NULL DEFAULT 'MEMBER',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DepartmentMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");
CREATE UNIQUE INDEX "DepartmentMembership_userId_departmentId_key" ON "DepartmentMembership"("userId", "departmentId");
CREATE INDEX "DepartmentMembership_departmentId_idx" ON "DepartmentMembership"("departmentId");
CREATE UNIQUE INDEX "DepartmentMembership_one_primary_per_user" ON "DepartmentMembership"("userId") WHERE "isPrimary" = true;
ALTER TABLE "DepartmentMembership" ADD CONSTRAINT "DepartmentMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepartmentMembership" ADD CONSTRAINT "DepartmentMembership_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Department" ("id", "name", "code", "updatedAt")
SELECT 'legacy-' || md5(name), name, 'legacy-' || md5(name), CURRENT_TIMESTAMP
FROM (SELECT DISTINCT trim("department") AS name FROM "User" WHERE nullif(trim("department"), '') IS NOT NULL) AS old_departments;

INSERT INTO "DepartmentMembership" ("id", "userId", "departmentId", "isPrimary")
SELECT 'legacy-' || md5(u."id" || d."id"), u."id", d."id", true
FROM "User" u JOIN "Department" d ON d."name" = trim(u."department")
WHERE nullif(trim(u."department"), '') IS NOT NULL;

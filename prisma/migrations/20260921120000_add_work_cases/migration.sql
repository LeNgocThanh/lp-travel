CREATE TYPE "WorkCaseStatus" AS ENUM ('RECEIVED', 'CONSULTING', 'CONFIRMED', 'BOOKING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED');
CREATE TYPE "WorkCasePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

CREATE TABLE "WorkCase" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "WorkCaseStatus" NOT NULL DEFAULT 'RECEIVED',
    "priority" "WorkCasePriority" NOT NULL DEFAULT 'NORMAL',
    "expectedAt" TIMESTAMP(3),
    "description" TEXT,
    "customerId" TEXT,
    "customerNameSnapshot" TEXT NOT NULL,
    "customerPhoneSnapshot" TEXT,
    "departmentId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "createdByType" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkCaseItem" (
    "id" TEXT NOT NULL,
    "workCaseId" TEXT NOT NULL,
    "productId" TEXT,
    "productNameSnapshot" TEXT NOT NULL,
    "productTypeSnapshot" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkCaseItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkCaseContact" (
    "id" TEXT NOT NULL,
    "workCaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkCaseContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkCaseTraveler" (
    "id" TEXT NOT NULL,
    "workCaseId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkCaseTraveler_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkCase_code_key" ON "WorkCase"("code");
CREATE INDEX "WorkCase_departmentId_status_idx" ON "WorkCase"("departmentId", "status");
CREATE INDEX "WorkCase_receiverId_status_idx" ON "WorkCase"("receiverId", "status");
CREATE INDEX "WorkCase_customerId_idx" ON "WorkCase"("customerId");
CREATE INDEX "WorkCaseItem_workCaseId_idx" ON "WorkCaseItem"("workCaseId");
CREATE INDEX "WorkCaseItem_productId_idx" ON "WorkCaseItem"("productId");
CREATE INDEX "WorkCaseContact_workCaseId_idx" ON "WorkCaseContact"("workCaseId");
CREATE INDEX "WorkCaseTraveler_workCaseId_idx" ON "WorkCaseTraveler"("workCaseId");
ALTER TABLE "WorkCase" ADD CONSTRAINT "WorkCase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkCase" ADD CONSTRAINT "WorkCase_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkCase" ADD CONSTRAINT "WorkCase_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkCaseItem" ADD CONSTRAINT "WorkCaseItem_workCaseId_fkey" FOREIGN KEY ("workCaseId") REFERENCES "WorkCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkCaseItem" ADD CONSTRAINT "WorkCaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkCaseContact" ADD CONSTRAINT "WorkCaseContact_workCaseId_fkey" FOREIGN KEY ("workCaseId") REFERENCES "WorkCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkCaseTraveler" ADD CONSTRAINT "WorkCaseTraveler_workCaseId_fkey" FOREIGN KEY ("workCaseId") REFERENCES "WorkCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'ON_HOLD', 'CONFIRMED', 'CANCELLED');
CREATE TYPE "WorkTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');
CREATE TABLE "ServiceBooking" (
  "id" TEXT NOT NULL, "workCaseId" TEXT NOT NULL, "workCaseItemId" TEXT NOT NULL, "supplierId" TEXT,
  "supplierNameSnapshot" TEXT NOT NULL, "referenceCode" TEXT, "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
  "serviceAt" TIMESTAMP(3), "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceBooking_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkTask" (
  "id" TEXT NOT NULL, "workCaseId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT,
  "status" "WorkTaskStatus" NOT NULL DEFAULT 'TODO', "priority" "WorkCasePriority" NOT NULL DEFAULT 'NORMAL',
  "startAt" TIMESTAMP(3), "dueAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkTask_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkTaskAssignment" (
  "id" TEXT NOT NULL, "workTaskId" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'ASSIGNEE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkTaskAssignment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ServiceBooking_workCaseId_status_idx" ON "ServiceBooking"("workCaseId", "status");
CREATE INDEX "ServiceBooking_workCaseItemId_idx" ON "ServiceBooking"("workCaseItemId");
CREATE INDEX "ServiceBooking_supplierId_idx" ON "ServiceBooking"("supplierId");
CREATE INDEX "WorkTask_workCaseId_status_idx" ON "WorkTask"("workCaseId", "status");
CREATE INDEX "WorkTask_status_dueAt_idx" ON "WorkTask"("status", "dueAt");
CREATE UNIQUE INDEX "WorkTaskAssignment_workTaskId_userId_key" ON "WorkTaskAssignment"("workTaskId", "userId");
CREATE INDEX "WorkTaskAssignment_userId_idx" ON "WorkTaskAssignment"("userId");
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_workCaseId_fkey" FOREIGN KEY ("workCaseId") REFERENCES "WorkCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_workCaseItemId_fkey" FOREIGN KEY ("workCaseItemId") REFERENCES "WorkCaseItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkTask" ADD CONSTRAINT "WorkTask_workCaseId_fkey" FOREIGN KEY ("workCaseId") REFERENCES "WorkCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkTaskAssignment" ADD CONSTRAINT "WorkTaskAssignment_workTaskId_fkey" FOREIGN KEY ("workTaskId") REFERENCES "WorkTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkTaskAssignment" ADD CONSTRAINT "WorkTaskAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

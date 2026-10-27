CREATE TABLE "WorkCaseActivity" (
    "id" TEXT NOT NULL,
    "workCaseId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkCaseActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkCaseActivity_workCaseId_createdAt_idx" ON "WorkCaseActivity"("workCaseId", "createdAt");
ALTER TABLE "WorkCaseActivity" ADD CONSTRAINT "WorkCaseActivity_workCaseId_fkey" FOREIGN KEY ("workCaseId") REFERENCES "WorkCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

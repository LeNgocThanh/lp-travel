CREATE TABLE "WorkTaskComment" (
  "id" TEXT NOT NULL,
  "workTaskId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkTaskComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkTaskChecklistItem" (
  "id" TEXT NOT NULL,
  "workTaskId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "completedByType" TEXT,
  "completedById" TEXT,
  "completedByName" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkTaskChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkTaskComment_workTaskId_createdAt_idx" ON "WorkTaskComment"("workTaskId", "createdAt");
CREATE INDEX "WorkTaskChecklistItem_workTaskId_position_idx" ON "WorkTaskChecklistItem"("workTaskId", "position");
ALTER TABLE "WorkTaskComment" ADD CONSTRAINT "WorkTaskComment_workTaskId_fkey" FOREIGN KEY ("workTaskId") REFERENCES "WorkTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkTaskChecklistItem" ADD CONSTRAINT "WorkTaskChecklistItem_workTaskId_fkey" FOREIGN KEY ("workTaskId") REFERENCES "WorkTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

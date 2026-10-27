CREATE TYPE "CustomerMergeStatus" AS ENUM ('PENDING', 'MERGED', 'REJECTED');
ALTER TABLE "Notification" ADD COLUMN "dedupeKey" TEXT;
CREATE TABLE "CustomerMergeReview" (
  "id" TEXT NOT NULL,
  "sourceCustomerId" TEXT NOT NULL,
  "targetCustomerId" TEXT NOT NULL,
  "matchedFields" JSONB NOT NULL,
  "status" "CustomerMergeStatus" NOT NULL DEFAULT 'PENDING',
  "requestedByType" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "requestedByName" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedByName" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerMergeReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX "CustomerMergeReview_sourceCustomerId_targetCustomerId_idx" ON "CustomerMergeReview"("sourceCustomerId", "targetCustomerId");
CREATE UNIQUE INDEX "CustomerMergeReview_pending_pair_key" ON "CustomerMergeReview"(LEAST("sourceCustomerId", "targetCustomerId"), GREATEST("sourceCustomerId", "targetCustomerId")) WHERE "status" = 'PENDING';
CREATE INDEX "CustomerMergeReview_status_createdAt_idx" ON "CustomerMergeReview"("status", "createdAt");
ALTER TABLE "CustomerMergeReview" ADD CONSTRAINT "CustomerMergeReview_sourceCustomerId_fkey" FOREIGN KEY ("sourceCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerMergeReview" ADD CONSTRAINT "CustomerMergeReview_targetCustomerId_fkey" FOREIGN KEY ("targetCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerMergeReview" ADD CONSTRAINT "CustomerMergeReview_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

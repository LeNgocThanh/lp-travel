CREATE TYPE "DocumentTemplateType" AS ENUM ('HEADER', 'FOOTER', 'CONTENT');

CREATE TABLE "DocumentTemplate" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "DocumentTemplateType" NOT NULL,
  "description" TEXT,
  "content" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentTemplate_code_key" ON "DocumentTemplate"("code");
CREATE INDEX "DocumentTemplate_type_active_idx" ON "DocumentTemplate"("type", "active");
CREATE INDEX "DocumentTemplate_type_isDefault_idx" ON "DocumentTemplate"("type", "isDefault");

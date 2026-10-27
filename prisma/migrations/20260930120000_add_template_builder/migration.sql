CREATE TABLE "TemplateBuilderDocument" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "documentType" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "publishedVersionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TemplateBuilderDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TemplateBuilderVersion" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "schema" JSONB NOT NULL DEFAULT '{"blocks":[]}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdById" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "publishedById" TEXT,
  "publishedByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TemplateBuilderVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TemplateBuilderDocument_code_key" ON "TemplateBuilderDocument"("code");
CREATE UNIQUE INDEX "TemplateBuilderDocument_publishedVersionId_key" ON "TemplateBuilderDocument"("publishedVersionId");
CREATE INDEX "TemplateBuilderDocument_documentType_active_idx" ON "TemplateBuilderDocument"("documentType", "active");
CREATE UNIQUE INDEX "TemplateBuilderVersion_documentId_version_key" ON "TemplateBuilderVersion"("documentId", "version");
CREATE INDEX "TemplateBuilderVersion_documentId_status_idx" ON "TemplateBuilderVersion"("documentId", "status");
ALTER TABLE "TemplateBuilderVersion" ADD CONSTRAINT "TemplateBuilderVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "TemplateBuilderDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateBuilderDocument" ADD CONSTRAINT "TemplateBuilderDocument_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "TemplateBuilderVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

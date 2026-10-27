ALTER TABLE "DocumentTemplate"
ADD COLUMN "imageFolderId" TEXT,
ADD COLUMN "imageStoredName" TEXT,
ADD COLUMN "imageOriginalName" TEXT,
ADD COLUMN "imageMimeType" TEXT,
ADD COLUMN "imageAlt" TEXT;

ALTER TABLE "WorkCaseItinerary"
ADD COLUMN "headerImageFolderId" TEXT,
ADD COLUMN "headerImageStoredName" TEXT,
ADD COLUMN "headerImageMimeType" TEXT,
ADD COLUMN "headerImageAlt" TEXT,
ADD COLUMN "footerImageFolderId" TEXT,
ADD COLUMN "footerImageStoredName" TEXT,
ADD COLUMN "footerImageMimeType" TEXT,
ADD COLUMN "footerImageAlt" TEXT;

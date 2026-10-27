CREATE TABLE "Channel" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Channel_code_key" ON "Channel"("code");
CREATE UNIQUE INDEX "Channel_name_key" ON "Channel"("name");
CREATE INDEX "Channel_active_name_idx" ON "Channel"("active", "name");

INSERT INTO "Channel" ("id", "code", "name", "description", "updatedAt") VALUES
  ('channel-instagram', 'INSTAGRAM', 'Instagram', 'Kênh mạng xã hội Instagram.', CURRENT_TIMESTAMP),
  ('channel-tiktok', 'TIKTOK', 'TikTok', 'Kênh mạng xã hội TikTok.', CURRENT_TIMESTAMP),
  ('channel-google', 'GOOGLE', 'Google', 'Kênh tìm kiếm và quảng cáo Google.', CURRENT_TIMESTAMP),
  ('channel-facebook', 'FACEBOOK', 'Facebook', 'Kênh mạng xã hội Facebook.', CURRENT_TIMESTAMP);

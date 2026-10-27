CREATE TABLE "TourGuideContractSetting" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "companyName" TEXT NOT NULL,
  "taxCode" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "legalRepresentative" TEXT NOT NULL,
  "legalRepresentativeTitle" TEXT NOT NULL,
  "authorizationNumber" TEXT,
  "authorizedTitleDefault" TEXT,
  "bankName" TEXT NOT NULL,
  "bankAccountNumber" TEXT NOT NULL,
  "signingPlace" TEXT NOT NULL DEFAULT 'Hà Nội',
  "contractCopies" INTEGER NOT NULL DEFAULT 2,
  "article4" TEXT,
  "article5" TEXT,
  "article6" TEXT,
  "article7" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TourGuideContractSetting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "TourGuideContractSetting" ("id", "companyName", "taxCode", "address", "legalRepresentative", "legalRepresentativeTitle", "authorizationNumber", "authorizedTitleDefault", "bankName", "bankAccountNumber", "signingPlace", "contractCopies", "updatedAt")
VALUES ('default', 'CÔNG TY TNHH LA PASSION TRAVEL', '0111503217', 'Tầng 6, Số 214B Đường Trần Quang Khải, Phường Hoàn Kiếm, TP Hà Nội, Việt Nam', 'Vũ Vương Hoan', 'Giám Đốc', '01/UQ-GĐ', 'Trưởng phòng Lữ Hành', 'Ngân hàng Thương Mại Cổ Phần Tiên Phong', '66668888698', 'Hà Nội', 2, CURRENT_TIMESTAMP);

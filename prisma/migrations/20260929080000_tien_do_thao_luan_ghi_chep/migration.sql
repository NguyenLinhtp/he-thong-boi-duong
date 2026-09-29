-- CreateTable
CREATE TABLE "tien_do_hoc_tap" (
    "id" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "hocVienId" TEXT NOT NULL,
    "mucKey" TEXT NOT NULL,
    "hoanThanhLuc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tien_do_hoc_tap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thao_luan_hoc_tap" (
    "id" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "mucKey" TEXT NOT NULL,
    "nguoiDungId" TEXT NOT NULL,
    "hoTen" TEXT NOT NULL,
    "vaiTro" TEXT NOT NULL,
    "noiDung" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thao_luan_hoc_tap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ghi_chep_hoc_tap" (
    "id" TEXT NOT NULL,
    "nguoiDungId" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "mucKey" TEXT NOT NULL,
    "noiDung" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ghi_chep_hoc_tap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tien_do_hoc_tap_khoaId_hocVienId_mucKey_key" ON "tien_do_hoc_tap"("khoaId", "hocVienId", "mucKey");

-- CreateIndex
CREATE INDEX "thao_luan_hoc_tap_mucKey_khoaId_idx" ON "thao_luan_hoc_tap"("mucKey", "khoaId");

-- CreateIndex
CREATE UNIQUE INDEX "ghi_chep_hoc_tap_nguoiDungId_khoaId_mucKey_key" ON "ghi_chep_hoc_tap"("nguoiDungId", "khoaId", "mucKey");

-- AddForeignKey
ALTER TABLE "tien_do_hoc_tap" ADD CONSTRAINT "tien_do_hoc_tap_hocVienId_fkey" FOREIGN KEY ("hocVienId") REFERENCES "hoc_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

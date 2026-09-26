-- DropIndex
DROP INDEX "giang_vien_hoc_phan_khoaId_hocPhanId_key";

-- AlterTable
ALTER TABLE "buoi_hoc" ADD COLUMN     "lopId" TEXT;

-- AlterTable
ALTER TABLE "dang_ky_hoc" ADD COLUMN     "lopId" TEXT;

-- AlterTable
ALTER TABLE "giang_vien_hoc_phan" ADD COLUMN     "lopId" TEXT;

-- CreateTable
CREATE TABLE "lop_hoc" (
    "id" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "maLop" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "siSoToiDa" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lop_hoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lich_su_chuyen_lop" (
    "id" TEXT NOT NULL,
    "dangKyId" TEXT NOT NULL,
    "tuLopId" TEXT,
    "denLopId" TEXT NOT NULL,
    "ngayHieuLuc" TIMESTAMP(3) NOT NULL,
    "lyDo" TEXT,
    "nguoiThucHienTen" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lich_su_chuyen_lop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lop_hoc_maLop_key" ON "lop_hoc"("maLop");

-- CreateIndex
CREATE INDEX "lich_su_chuyen_lop_dangKyId_idx" ON "lich_su_chuyen_lop"("dangKyId");

-- CreateIndex
CREATE UNIQUE INDEX "giang_vien_hoc_phan_khoaId_lopId_hocPhanId_key" ON "giang_vien_hoc_phan"("khoaId", "lopId", "hocPhanId");

-- AddForeignKey
ALTER TABLE "giang_vien_hoc_phan" ADD CONSTRAINT "giang_vien_hoc_phan_lopId_fkey" FOREIGN KEY ("lopId") REFERENCES "lop_hoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dang_ky_hoc" ADD CONSTRAINT "dang_ky_hoc_lopId_fkey" FOREIGN KEY ("lopId") REFERENCES "lop_hoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lop_hoc" ADD CONSTRAINT "lop_hoc_khoaId_fkey" FOREIGN KEY ("khoaId") REFERENCES "khoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_chuyen_lop" ADD CONSTRAINT "lich_su_chuyen_lop_dangKyId_fkey" FOREIGN KEY ("dangKyId") REFERENCES "dang_ky_hoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_chuyen_lop" ADD CONSTRAINT "lich_su_chuyen_lop_tuLopId_fkey" FOREIGN KEY ("tuLopId") REFERENCES "lop_hoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_chuyen_lop" ADD CONSTRAINT "lich_su_chuyen_lop_denLopId_fkey" FOREIGN KEY ("denLopId") REFERENCES "lop_hoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buoi_hoc" ADD CONSTRAINT "buoi_hoc_lopId_fkey" FOREIGN KEY ("lopId") REFERENCES "lop_hoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

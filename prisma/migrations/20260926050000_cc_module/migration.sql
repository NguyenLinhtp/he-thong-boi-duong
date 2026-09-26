-- CreateEnum
CREATE TYPE "KenhNhanChungChi" AS ENUM ('TRUC_TIEP', 'BAN_GIAO_DVLK');

-- AlterTable
ALTER TABLE "chung_chi" ADD COLUMN     "banGiaoId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lyDoHuy" TEXT,
ADD COLUMN     "ngayHuy" TIMESTAMP(3),
ADD COLUMN     "ngayInSoHieu" TIMESTAMP(3),
ADD COLUMN     "ngayNhan" TIMESTAMP(3),
ADD COLUMN     "nguoiDeNghi" TEXT,
ADD COLUMN     "nguoiNhan" TEXT,
ADD COLUMN     "soQuyetDinh" TEXT,
DROP COLUMN "kenhNhan",
ADD COLUMN     "kenhNhan" "KenhNhanChungChi",
ALTER COLUMN "trangThai" SET DEFAULT 'DE_NGHI';

-- CreateTable
CREATE TABLE "ban_giao_chung_chi" (
    "id" TEXT NOT NULL,
    "maLo" TEXT NOT NULL,
    "hopDongLienKetId" TEXT NOT NULL,
    "ngayBanGiao" TIMESTAMP(3) NOT NULL,
    "nguoiDaiDienNhan" TEXT NOT NULL,
    "nguoiBanGiao" TEXT NOT NULL,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ban_giao_chung_chi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ban_giao_chung_chi_maLo_key" ON "ban_giao_chung_chi"("maLo");

-- CreateIndex
CREATE UNIQUE INDEX "chung_chi_soVaoSo_key" ON "chung_chi"("soVaoSo");

-- CreateIndex
CREATE INDEX "chung_chi_khoaId_idx" ON "chung_chi"("khoaId");

-- AddForeignKey
ALTER TABLE "chung_chi" ADD CONSTRAINT "chung_chi_banGiaoId_fkey" FOREIGN KEY ("banGiaoId") REFERENCES "ban_giao_chung_chi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ban_giao_chung_chi" ADD CONSTRAINT "ban_giao_chung_chi_hopDongLienKetId_fkey" FOREIGN KEY ("hopDongLienKetId") REFERENCES "hop_dong_lien_ket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

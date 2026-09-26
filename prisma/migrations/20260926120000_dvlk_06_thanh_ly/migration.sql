-- AlterTable
ALTER TABLE "hop_dong_lien_ket" ADD COLUMN     "ghiChuThanhLy" TEXT,
ADD COLUMN     "nguoiThanhLy" TEXT,
ADD COLUMN     "soBienBanThanhLy" TEXT,
ADD COLUMN     "soHocVienHoanThanh" INTEGER,
ADD COLUMN     "soHocVienThoiHoc" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "hop_dong_lien_ket_soBienBanThanhLy_key" ON "hop_dong_lien_ket"("soBienBanThanhLy");

-- AlterTable
ALTER TABLE "chuong_trinh" ADD COLUMN     "cauHinhFormDangKy" JSONB;

-- AlterTable
ALTER TABLE "dang_ky_hoc" ADD COLUMN     "thongTinBoSung" JSONB;

-- AlterTable
ALTER TABLE "khoa" ADD COLUMN     "cauHinhFormDangKy" JSONB;

-- CreateTable
CREATE TABLE "tep_ho_so_dang_ky" (
    "id" TEXT NOT NULL,
    "dangKyId" TEXT NOT NULL,
    "maTruong" TEXT NOT NULL,
    "nhanTruong" TEXT NOT NULL,
    "tenFile" TEXT NOT NULL,
    "loaiFile" TEXT NOT NULL,
    "kichThuoc" INTEGER NOT NULL,
    "khoaLuuTru" TEXT NOT NULL,
    "taiLenLuc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tep_ho_so_dang_ky_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tep_ho_so_dang_ky_khoaLuuTru_key" ON "tep_ho_so_dang_ky"("khoaLuuTru");

-- CreateIndex
CREATE UNIQUE INDEX "tep_ho_so_dang_ky_dangKyId_maTruong_key" ON "tep_ho_so_dang_ky"("dangKyId", "maTruong");

-- AddForeignKey
ALTER TABLE "tep_ho_so_dang_ky" ADD CONSTRAINT "tep_ho_so_dang_ky_dangKyId_fkey" FOREIGN KEY ("dangKyId") REFERENCES "dang_ky_hoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

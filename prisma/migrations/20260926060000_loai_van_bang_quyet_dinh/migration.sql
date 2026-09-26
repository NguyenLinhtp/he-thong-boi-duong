-- CreateEnum
CREATE TYPE "LoaiVanBang" AS ENUM ('CHUNG_CHI', 'CHUNG_NHAN');

-- AlterTable
ALTER TABLE "chung_chi" ADD COLUMN     "loaiVanBang" "LoaiVanBang" NOT NULL DEFAULT 'CHUNG_CHI',
ADD COLUMN     "quyetDinhId" TEXT;

-- AlterTable
ALTER TABLE "chuong_trinh" ADD COLUMN     "loaiVanBang" "LoaiVanBang" NOT NULL DEFAULT 'CHUNG_CHI';

-- CreateTable
CREATE TABLE "quyet_dinh_cap_van_bang" (
    "id" TEXT NOT NULL,
    "soQuyetDinh" TEXT NOT NULL,
    "ngayKy" TIMESTAMP(3) NOT NULL,
    "nguoiKy" TEXT NOT NULL,
    "loaiVanBang" "LoaiVanBang" NOT NULL,
    "khoaId" TEXT NOT NULL,
    "lopId" TEXT,
    "nguoiNhap" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quyet_dinh_cap_van_bang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quyet_dinh_cap_van_bang_khoaId_idx" ON "quyet_dinh_cap_van_bang"("khoaId");

-- AddForeignKey
ALTER TABLE "chung_chi" ADD CONSTRAINT "chung_chi_quyetDinhId_fkey" FOREIGN KEY ("quyetDinhId") REFERENCES "quyet_dinh_cap_van_bang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quyet_dinh_cap_van_bang" ADD CONSTRAINT "quyet_dinh_cap_van_bang_khoaId_fkey" FOREIGN KEY ("khoaId") REFERENCES "khoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quyet_dinh_cap_van_bang" ADD CONSTRAINT "quyet_dinh_cap_van_bang_lopId_fkey" FOREIGN KEY ("lopId") REFERENCES "lop_hoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

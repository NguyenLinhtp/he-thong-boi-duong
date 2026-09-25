-- CreateEnum
CREATE TYPE "LoaiSuKienThongBao" AS ENUM ('TRUNG_TUYEN', 'NHAC_NOP_HO_SO_GIAY', 'LICH_HOC_LICH_THI', 'NHAC_HOC_PHI', 'KET_QUA', 'CAP_CHUNG_CHI');

-- CreateTable
CREATE TABLE "thong_bao" (
    "id" TEXT NOT NULL,
    "hocVienId" TEXT NOT NULL,
    "loaiSuKien" "LoaiSuKienThongBao" NOT NULL,
    "tieuDe" TEXT NOT NULL,
    "noiDung" TEXT NOT NULL,
    "daGuiEmail" BOOLEAN NOT NULL DEFAULT false,
    "loiGuiEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thong_bao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cau_hinh_smtp" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "taiKhoan" TEXT NOT NULL,
    "matKhauMaHoa" TEXT NOT NULL,
    "tuDiaChi" TEXT NOT NULL,
    "capNhatLuc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cau_hinh_smtp_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "thong_bao" ADD CONSTRAINT "thong_bao_hocVienId_fkey" FOREIGN KEY ("hocVienId") REFERENCES "hoc_vien"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "TrangThaiSaoLuu" AS ENUM ('DANG_CHAY', 'THANH_CONG', 'THAT_BAI');

-- CreateEnum
CREATE TYPE "LoaiKichHoatSaoLuu" AS ENUM ('THU_CONG', 'TU_DONG');

-- CreateTable
CREATE TABLE "sao_luu" (
    "id" TEXT NOT NULL,
    "thoiGianBatDau" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thoiGianKetThuc" TIMESTAMP(3),
    "trangThai" "TrangThaiSaoLuu" NOT NULL DEFAULT 'DANG_CHAY',
    "loaiKichHoat" "LoaiKichHoatSaoLuu" NOT NULL DEFAULT 'THU_CONG',
    "nguoiKichHoat" TEXT,
    "duongDanFile" TEXT,
    "kichThuocByte" INTEGER,
    "loiChiTiet" TEXT,

    CONSTRAINT "sao_luu_pkey" PRIMARY KEY ("id")
);


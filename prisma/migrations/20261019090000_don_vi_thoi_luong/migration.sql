-- CreateEnum
CREATE TYPE "DonViThoiLuong" AS ENUM ('TIET', 'TIN_CHI', 'BUOI');

-- AlterTable
ALTER TABLE "chuong_trinh" ADD COLUMN     "donViThoiLuong" "DonViThoiLuong" NOT NULL DEFAULT 'TIET';

-- AlterTable
ALTER TABLE "chuong_trinh_phien_ban" ADD COLUMN     "donViThoiLuong" "DonViThoiLuong";

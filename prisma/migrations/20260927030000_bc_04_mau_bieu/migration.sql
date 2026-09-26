-- CreateEnum
CREATE TYPE "NhomBaoCao" AS ENUM ('TONG', 'LOAI_HINH', 'CHUONG_TRINH', 'KHOA');

-- CreateTable
CREATE TABLE "mau_bieu_bao_cao" (
    "id" TEXT NOT NULL,
    "ma" TEXT NOT NULL,
    "phienBan" INTEGER NOT NULL,
    "ten" TEXT NOT NULL,
    "coQuanNhan" TEXT,
    "canCu" TEXT,
    "nhomTheo" "NhomBaoCao" NOT NULL,
    "cot" JSONB NOT NULL,
    "dangApDung" BOOLEAN NOT NULL DEFAULT true,
    "nguoiCapNhat" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mau_bieu_bao_cao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mau_bieu_bao_cao_ma_phienBan_key" ON "mau_bieu_bao_cao"("ma", "phienBan");

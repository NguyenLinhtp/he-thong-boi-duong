-- CreateEnum
CREATE TYPE "TrangThaiGiaoDichNganHang" AS ENUM ('DA_GHI_NHAN', 'THUA_TIEN', 'CAN_XU_LY', 'DA_XU_LY');

-- CreateTable
CREATE TABLE "giao_dich_ngan_hang" (
    "id" TEXT NOT NULL,
    "nguon" TEXT NOT NULL,
    "maGiaoDichNguon" TEXT NOT NULL,
    "soTaiKhoan" TEXT,
    "soTien" DECIMAL(12,2) NOT NULL,
    "noiDung" TEXT NOT NULL,
    "maThamChieu" TEXT,
    "thoiGianGiaoDich" TIMESTAMP(3) NOT NULL,
    "nhanLuc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trangThai" "TrangThaiGiaoDichNganHang" NOT NULL,
    "ghiChu" TEXT,
    "hocPhiId" TEXT,
    "soTienGhiNhan" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "soPhieuThu" TEXT,
    "duLieuGoc" JSONB,
    "xuLyBoiTen" TEXT,
    "xuLyLuc" TIMESTAMP(3),

    CONSTRAINT "giao_dich_ngan_hang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "giao_dich_ngan_hang_trangThai_idx" ON "giao_dich_ngan_hang"("trangThai");

-- CreateIndex
CREATE INDEX "giao_dich_ngan_hang_hocPhiId_idx" ON "giao_dich_ngan_hang"("hocPhiId");

-- CreateIndex
CREATE UNIQUE INDEX "giao_dich_ngan_hang_nguon_maGiaoDichNguon_key" ON "giao_dich_ngan_hang"("nguon", "maGiaoDichNguon");

-- AddForeignKey
ALTER TABLE "giao_dich_ngan_hang" ADD CONSTRAINT "giao_dich_ngan_hang_hocPhiId_fkey" FOREIGN KEY ("hocPhiId") REFERENCES "hoc_phi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

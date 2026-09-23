-- AlterTable
ALTER TABLE "chuong_trinh" ADD COLUMN     "phienBanHienTai" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "chuong_trinh_phien_ban" (
    "id" TEXT NOT NULL,
    "chuongTrinhId" TEXT NOT NULL,
    "phienBan" INTEGER NOT NULL,
    "ten" TEXT NOT NULL,
    "mucTieu" TEXT,
    "doiTuongApDung" TEXT,
    "tongThoiLuong" INTEGER,
    "loaiHinhBoiDuongId" TEXT NOT NULL,
    "lyDoSua" TEXT,
    "luuLucAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chuong_trinh_phien_ban_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chuong_trinh_phien_ban_chuongTrinhId_phienBan_key" ON "chuong_trinh_phien_ban"("chuongTrinhId", "phienBan");

-- AddForeignKey
ALTER TABLE "chuong_trinh_phien_ban" ADD CONSTRAINT "chuong_trinh_phien_ban_chuongTrinhId_fkey" FOREIGN KEY ("chuongTrinhId") REFERENCES "chuong_trinh"("id") ON DELETE CASCADE ON UPDATE CASCADE;

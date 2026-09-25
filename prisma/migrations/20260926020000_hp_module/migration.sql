-- AlterTable
ALTER TABLE "hoc_phi" ADD COLUMN     "boQuaKiemTra" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hanNop" TIMESTAMP(3),
ADD COLUMN     "lanNhacGanNhat" TIMESTAMP(3),
ADD COLUMN     "lyDoBoQua" TEXT;

-- AlterTable
ALTER TABLE "khoa" ADD COLUMN     "chinhSachMienGiam" TEXT,
ADD COLUMN     "lyDoDieuChinhHocPhi" TEXT;

-- CreateTable
CREATE TABLE "phieu_thu" (
    "id" TEXT NOT NULL,
    "soPhieu" TEXT NOT NULL,
    "hocPhiId" TEXT NOT NULL,
    "soTien" DECIMAL(12,2) NOT NULL,
    "hinhThucNop" TEXT,
    "ngayLap" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nguoiLapId" TEXT,
    "nguoiLapTen" TEXT,

    CONSTRAINT "phieu_thu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phieu_thu_soPhieu_key" ON "phieu_thu"("soPhieu");

-- AddForeignKey
ALTER TABLE "phieu_thu" ADD CONSTRAINT "phieu_thu_hocPhiId_fkey" FOREIGN KEY ("hocPhiId") REFERENCES "hoc_phi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


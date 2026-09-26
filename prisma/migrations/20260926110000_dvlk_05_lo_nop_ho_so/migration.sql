-- AlterTable
ALTER TABLE "dang_ky_hoc" ADD COLUMN     "loNopHoSoId" TEXT;

-- CreateTable
CREATE TABLE "lo_nop_ho_so" (
    "id" TEXT NOT NULL,
    "maLo" TEXT NOT NULL,
    "hopDongLienKetId" TEXT NOT NULL,
    "ngayGui" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hinhThuc" TEXT,
    "ghiChu" TEXT,
    "nguoiXacNhan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lo_nop_ho_so_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lo_nop_ho_so_maLo_key" ON "lo_nop_ho_so"("maLo");

-- AddForeignKey
ALTER TABLE "dang_ky_hoc" ADD CONSTRAINT "dang_ky_hoc_loNopHoSoId_fkey" FOREIGN KEY ("loNopHoSoId") REFERENCES "lo_nop_ho_so"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lo_nop_ho_so" ADD CONSTRAINT "lo_nop_ho_so_hopDongLienKetId_fkey" FOREIGN KEY ("hopDongLienKetId") REFERENCES "hop_dong_lien_ket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

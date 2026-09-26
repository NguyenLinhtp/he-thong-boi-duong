-- DropIndex
DROP INDEX "ket_qua_hoc_tap_hocVienId_hocPhanId_key";

-- AlterTable
ALTER TABLE "ket_qua_hoc_tap" ADD COLUMN     "diemHocPhan" DECIMAL(4,2),
ADD COLUMN     "khoaId" TEXT NOT NULL,
ADD COLUMN     "soQuyetDinhPhucKhao" TEXT;

-- CreateTable
CREATE TABLE "ket_qua_khoa" (
    "id" TEXT NOT NULL,
    "hocVienId" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "diemTongKet" DECIMAL(4,2),
    "tyLeChuyenCan" DECIMAL(5,2),
    "datHocTap" BOOLEAN,
    "duDieuKienHocPhi" BOOLEAN,
    "hoanThanh" BOOLEAN,
    "ghiChu" TEXT,
    "daPheDuyet" BOOLEAN NOT NULL DEFAULT false,
    "soQuyetDinh" TEXT,
    "ngayPheDuyet" TIMESTAMP(3),
    "nguoiPheDuyet" TEXT,
    "capNhatLuc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ket_qua_khoa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ket_qua_khoa_hocVienId_khoaId_key" ON "ket_qua_khoa"("hocVienId", "khoaId");

-- CreateIndex
CREATE UNIQUE INDEX "ket_qua_hoc_tap_hocVienId_khoaId_hocPhanId_key" ON "ket_qua_hoc_tap"("hocVienId", "khoaId", "hocPhanId");

-- AddForeignKey
ALTER TABLE "ket_qua_hoc_tap" ADD CONSTRAINT "ket_qua_hoc_tap_khoaId_fkey" FOREIGN KEY ("khoaId") REFERENCES "khoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ket_qua_khoa" ADD CONSTRAINT "ket_qua_khoa_hocVienId_fkey" FOREIGN KEY ("hocVienId") REFERENCES "hoc_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ket_qua_khoa" ADD CONSTRAINT "ket_qua_khoa_khoaId_fkey" FOREIGN KEY ("khoaId") REFERENCES "khoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "phieu_thu" ADD COLUMN     "hocPhiThanhPhanId" TEXT;

-- CreateTable
CREATE TABLE "thanh_phan_le_phi" (
    "id" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "batBuoc" BOOLEAN NOT NULL DEFAULT false,
    "mucSinhVien" DECIMAL(12,2) NOT NULL,
    "mucTuDo" DECIMAL(12,2),
    "thuTu" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "thanh_phan_le_phi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hoc_phi_thanh_phan" (
    "id" TEXT NOT NULL,
    "hocPhiId" TEXT NOT NULL,
    "thanhPhanId" TEXT NOT NULL,
    "soTienPhaiNop" DECIMAL(12,2) NOT NULL,
    "soTienDaNop" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "trangThai" "TrangThaiHocPhi" NOT NULL DEFAULT 'CHUA_NOP',

    CONSTRAINT "hoc_phi_thanh_phan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hoc_phi_thanh_phan_hocPhiId_thanhPhanId_key" ON "hoc_phi_thanh_phan"("hocPhiId", "thanhPhanId");

-- AddForeignKey
ALTER TABLE "phieu_thu" ADD CONSTRAINT "phieu_thu_hocPhiThanhPhanId_fkey" FOREIGN KEY ("hocPhiThanhPhanId") REFERENCES "hoc_phi_thanh_phan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thanh_phan_le_phi" ADD CONSTRAINT "thanh_phan_le_phi_khoaId_fkey" FOREIGN KEY ("khoaId") REFERENCES "khoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hoc_phi_thanh_phan" ADD CONSTRAINT "hoc_phi_thanh_phan_hocPhiId_fkey" FOREIGN KEY ("hocPhiId") REFERENCES "hoc_phi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hoc_phi_thanh_phan" ADD CONSTRAINT "hoc_phi_thanh_phan_thanhPhanId_fkey" FOREIGN KEY ("thanhPhanId") REFERENCES "thanh_phan_le_phi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

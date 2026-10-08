-- (bổ sung 07/10/2026 - HV-01/HV-05/HP-02/HP-04) mẫu in đơn đăng ký/biên lai; 1 biên lai nhiều dòng thành phần

-- AlterTable
ALTER TABLE "chuong_trinh" ADD COLUMN     "mauBienLai" JSONB,
ADD COLUMN     "mauDonDangKy" JSONB;

-- AlterTable
ALTER TABLE "khoa" ADD COLUMN     "mauDonDangKy" JSONB;

-- CreateTable
CREATE TABLE "phieu_thu_chi_tiet" (
    "id" TEXT NOT NULL,
    "phieuThuId" TEXT NOT NULL,
    "hocPhiThanhPhanId" TEXT NOT NULL,
    "noiDung" TEXT NOT NULL,
    "soTien" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "phieu_thu_chi_tiet_pkey" PRIMARY KEY ("id")
);

-- Chuyển dữ liệu: mỗi phiếu thu cũ gắn 1 thành phần -> 1 dòng chi tiết
INSERT INTO "phieu_thu_chi_tiet" ("id", "phieuThuId", "hocPhiThanhPhanId", "noiDung", "soTien")
SELECT 'ptct_' || pt."id", pt."id", pt."hocPhiThanhPhanId", tp."ten", pt."soTien"
FROM "phieu_thu" pt
JOIN "hoc_phi_thanh_phan" d ON d."id" = pt."hocPhiThanhPhanId"
JOIN "thanh_phan_le_phi" tp ON tp."id" = d."thanhPhanId"
WHERE pt."hocPhiThanhPhanId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "phieu_thu" DROP CONSTRAINT "phieu_thu_hocPhiThanhPhanId_fkey";

-- AlterTable
ALTER TABLE "phieu_thu" DROP COLUMN "hocPhiThanhPhanId",
ADD COLUMN     "noiDungIn" JSONB,
ADD COLUMN     "thayChoSoPhieu" TEXT;

-- CreateIndex
CREATE INDEX "phieu_thu_chi_tiet_hocPhiThanhPhanId_idx" ON "phieu_thu_chi_tiet"("hocPhiThanhPhanId");

-- AddForeignKey
ALTER TABLE "phieu_thu_chi_tiet" ADD CONSTRAINT "phieu_thu_chi_tiet_phieuThuId_fkey" FOREIGN KEY ("phieuThuId") REFERENCES "phieu_thu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phieu_thu_chi_tiet" ADD CONSTRAINT "phieu_thu_chi_tiet_hocPhiThanhPhanId_fkey" FOREIGN KEY ("hocPhiThanhPhanId") REFERENCES "hoc_phi_thanh_phan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

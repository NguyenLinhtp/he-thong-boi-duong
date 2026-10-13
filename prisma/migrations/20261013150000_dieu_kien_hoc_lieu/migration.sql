-- AlterTable
ALTER TABLE "bai_trac_nghiem" ADD COLUMN     "diemDat" DECIMAL(4,2);

-- AlterTable
ALTER TABLE "chuong_trinh" ADD COLUMN     "chuyenCanToiThieu" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "khoa" ADD COLUMN     "chuyenCanToiThieu" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "yeu_cau_san_pham" ADD COLUMN     "diemDat" DECIMAL(4,2);

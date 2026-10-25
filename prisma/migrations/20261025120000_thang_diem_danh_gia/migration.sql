-- AlterTable
ALTER TABLE "bai_nop_san_pham" ALTER COLUMN "diem" SET DATA TYPE DECIMAL(6,2);

-- AlterTable
ALTER TABLE "bai_trac_nghiem" ADD COLUMN     "thangDiem" INTEGER NOT NULL DEFAULT 10,
ALTER COLUMN "diemDat" SET DATA TYPE DECIMAL(6,2);

-- AlterTable
ALTER TABLE "lan_lam_trac_nghiem" ALTER COLUMN "diem" SET DATA TYPE DECIMAL(6,2);

-- AlterTable
ALTER TABLE "yeu_cau_san_pham" ADD COLUMN     "thangDiem" INTEGER NOT NULL DEFAULT 10,
ALTER COLUMN "diemDat" SET DATA TYPE DECIMAL(6,2);

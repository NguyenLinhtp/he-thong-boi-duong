-- AlterTable
ALTER TABLE "chuong_trinh" ADD COLUMN     "cauHinhDiemThi" JSONB;

-- AlterTable
ALTER TABLE "ket_qua_khoa" ADD COLUMN     "diemThanhPhan" JSONB,
ALTER COLUMN "diemTongKet" SET DATA TYPE DECIMAL(6,2);

-- AlterTable
ALTER TABLE "khoa" ADD COLUMN     "cauHinhDiemThi" JSONB;

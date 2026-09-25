-- AlterEnum
ALTER TYPE "TrangThaiDangKy" ADD VALUE 'HUY_QUA_HAN_NOP_GIAY';

-- AlterTable
ALTER TABLE "dang_ky_hoc" ADD COLUMN     "hanNopGiay" TIMESTAMP(3);

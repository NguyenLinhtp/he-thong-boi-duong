-- AlterTable
ALTER TABLE "phieu_thu" ADD COLUMN     "daHuy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "huyLuc" TIMESTAMP(3),
ADD COLUMN     "lyDoHuy" TEXT,
ADD COLUMN     "nguoiHuyTen" TEXT;

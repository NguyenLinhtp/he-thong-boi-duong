-- AlterTable
ALTER TABLE "buoi_hoc" ADD COLUMN     "daHuy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lyDoThayDoi" TEXT,
ADD COLUMN     "nhanXet" TEXT,
ADD COLUMN     "noiDungDaGiang" TEXT;

-- AlterTable
ALTER TABLE "giang_vien" ADD COLUMN     "email" TEXT,
ADD COLUMN     "soDienThoai" TEXT;

-- AlterTable
ALTER TABLE "thong_bao" ADD COLUMN     "giangVienId" TEXT,
ALTER COLUMN "hocVienId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "thong_bao" ADD CONSTRAINT "thong_bao_giangVienId_fkey" FOREIGN KEY ("giangVienId") REFERENCES "giang_vien"("id") ON DELETE CASCADE ON UPDATE CASCADE;


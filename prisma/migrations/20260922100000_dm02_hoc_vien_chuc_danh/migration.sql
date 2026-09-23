-- AlterTable
ALTER TABLE "hoc_vien" ADD COLUMN     "chucDanhHocViId" TEXT;

-- AddForeignKey
ALTER TABLE "hoc_vien" ADD CONSTRAINT "hoc_vien_chucDanhHocViId_fkey" FOREIGN KEY ("chucDanhHocViId") REFERENCES "chuc_danh_hoc_vi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

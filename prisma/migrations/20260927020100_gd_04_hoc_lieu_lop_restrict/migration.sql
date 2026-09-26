-- DropForeignKey
ALTER TABLE "tai_lieu_hoc_tap" DROP CONSTRAINT "tai_lieu_hoc_tap_lopId_fkey";

-- AddForeignKey
ALTER TABLE "tai_lieu_hoc_tap" ADD CONSTRAINT "tai_lieu_hoc_tap_lopId_fkey" FOREIGN KEY ("lopId") REFERENCES "lop_hoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

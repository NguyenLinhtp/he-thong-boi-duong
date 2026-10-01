-- AlterTable
ALTER TABLE "hoc_vien" ADD COLUMN     "lopSinhHoat" TEXT,
ADD COLUMN     "maSinhVien" TEXT;

-- AlterTable
ALTER TABLE "khoa" ADD COLUMN     "hanDangKy" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "sinh_vien" (
    "id" TEXT NOT NULL,
    "maSinhVien" TEXT NOT NULL,
    "soCCCD" TEXT NOT NULL,
    "hoTen" TEXT NOT NULL,
    "lopSinhHoat" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sinh_vien_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sinh_vien_maSinhVien_key" ON "sinh_vien"("maSinhVien");

-- CreateIndex
CREATE UNIQUE INDEX "sinh_vien_soCCCD_key" ON "sinh_vien"("soCCCD");

-- CreateIndex
CREATE UNIQUE INDEX "hoc_vien_maSinhVien_key" ON "hoc_vien"("maSinhVien");

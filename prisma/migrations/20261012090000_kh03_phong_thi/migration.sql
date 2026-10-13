-- CreateEnum
CREATE TYPE "LoaiDotThi" AS ENUM ('THI', 'ON_THI');

-- CreateTable
CREATE TABLE "dot_thi" (
    "id" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "loai" "LoaiDotThi" NOT NULL DEFAULT 'THI',
    "thanhPhanId" TEXT,
    "moTa" TEXT,
    "daChot" BOOLEAN NOT NULL DEFAULT false,
    "chotLuc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dot_thi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phong_thi" (
    "id" TEXT NOT NULL,
    "dotThiId" TEXT NOT NULL,
    "thuTu" INTEGER NOT NULL,
    "ten" TEXT NOT NULL,
    "ngay" DATE,
    "ca" TEXT,
    "gioBatDau" TEXT,
    "gioKetThuc" TEXT,
    "phongHocId" TEXT,
    "diaDiem" TEXT,
    "sucChua" INTEGER NOT NULL,

    CONSTRAINT "phong_thi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xep_phong_thi" (
    "id" TEXT NOT NULL,
    "phongThiId" TEXT NOT NULL,
    "dotThiId" TEXT NOT NULL,
    "dangKyId" TEXT NOT NULL,
    "soBaoDanh" INTEGER NOT NULL,
    "thuTu" INTEGER NOT NULL,
    "boSung" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "xep_phong_thi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dot_thi_khoaId_idx" ON "dot_thi"("khoaId");

-- CreateIndex
CREATE UNIQUE INDEX "phong_thi_dotThiId_thuTu_key" ON "phong_thi"("dotThiId", "thuTu");

-- CreateIndex
CREATE UNIQUE INDEX "xep_phong_thi_dotThiId_dangKyId_key" ON "xep_phong_thi"("dotThiId", "dangKyId");

-- CreateIndex
CREATE UNIQUE INDEX "xep_phong_thi_dotThiId_soBaoDanh_key" ON "xep_phong_thi"("dotThiId", "soBaoDanh");

-- AddForeignKey
ALTER TABLE "dot_thi" ADD CONSTRAINT "dot_thi_khoaId_fkey" FOREIGN KEY ("khoaId") REFERENCES "khoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dot_thi" ADD CONSTRAINT "dot_thi_thanhPhanId_fkey" FOREIGN KEY ("thanhPhanId") REFERENCES "thanh_phan_le_phi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phong_thi" ADD CONSTRAINT "phong_thi_dotThiId_fkey" FOREIGN KEY ("dotThiId") REFERENCES "dot_thi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phong_thi" ADD CONSTRAINT "phong_thi_phongHocId_fkey" FOREIGN KEY ("phongHocId") REFERENCES "phong_hoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xep_phong_thi" ADD CONSTRAINT "xep_phong_thi_phongThiId_fkey" FOREIGN KEY ("phongThiId") REFERENCES "phong_thi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xep_phong_thi" ADD CONSTRAINT "xep_phong_thi_dangKyId_fkey" FOREIGN KEY ("dangKyId") REFERENCES "dang_ky_hoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

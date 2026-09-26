-- CreateTable
CREATE TABLE "tai_lieu_hoc_tap" (
    "id" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "hocPhanId" TEXT NOT NULL,
    "lopId" TEXT,
    "tieuDe" TEXT NOT NULL,
    "moTa" TEXT,
    "tenFile" TEXT,
    "loaiFile" TEXT,
    "kichThuoc" INTEGER,
    "khoaLuuTru" TEXT,
    "duongLink" TEXT,
    "giangVienId" TEXT,
    "nguoiDang" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tai_lieu_hoc_tap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tai_lieu_hoc_tap_khoaLuuTru_key" ON "tai_lieu_hoc_tap"("khoaLuuTru");

-- CreateIndex
CREATE INDEX "tai_lieu_hoc_tap_khoaId_idx" ON "tai_lieu_hoc_tap"("khoaId");

-- AddForeignKey
ALTER TABLE "tai_lieu_hoc_tap" ADD CONSTRAINT "tai_lieu_hoc_tap_khoaId_fkey" FOREIGN KEY ("khoaId") REFERENCES "khoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tai_lieu_hoc_tap" ADD CONSTRAINT "tai_lieu_hoc_tap_hocPhanId_fkey" FOREIGN KEY ("hocPhanId") REFERENCES "hoc_phan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tai_lieu_hoc_tap" ADD CONSTRAINT "tai_lieu_hoc_tap_lopId_fkey" FOREIGN KEY ("lopId") REFERENCES "lop_hoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tai_lieu_hoc_tap" ADD CONSTRAINT "tai_lieu_hoc_tap_giangVienId_fkey" FOREIGN KEY ("giangVienId") REFERENCES "giang_vien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

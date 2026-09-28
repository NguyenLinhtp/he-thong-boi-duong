-- CreateEnum
CREATE TYPE "LoaiHocLieu" AS ENUM ('TAI_LIEU', 'SLIDE', 'THONG_TIN', 'VIDEO');

-- CreateTable
CREATE TABLE "hoc_lieu_hoc_phan" (
    "id" TEXT NOT NULL,
    "hocPhanId" TEXT NOT NULL,
    "loai" "LoaiHocLieu" NOT NULL,
    "tieuDe" TEXT NOT NULL,
    "moTa" TEXT,
    "noiDung" TEXT,
    "tenFile" TEXT,
    "loaiFile" TEXT,
    "kichThuoc" INTEGER,
    "khoaLuuTru" TEXT,
    "duongLink" TEXT,
    "thuTu" INTEGER NOT NULL DEFAULT 0,
    "nguoiDang" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hoc_lieu_hoc_phan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bai_trac_nghiem" (
    "id" TEXT NOT NULL,
    "hocPhanId" TEXT NOT NULL,
    "tieuDe" TEXT NOT NULL,
    "moTa" TEXT,
    "thoiGianPhut" INTEGER,
    "soLanToiDa" INTEGER,
    "tinhDiem" BOOLEAN NOT NULL DEFAULT false,
    "heSo" DECIMAL(4,2) NOT NULL DEFAULT 1,
    "thuTu" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bai_trac_nghiem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cau_hoi_trac_nghiem" (
    "id" TEXT NOT NULL,
    "baiId" TEXT NOT NULL,
    "noiDung" TEXT NOT NULL,
    "phuongAn" TEXT[],
    "dapAnDung" INTEGER[],
    "thuTu" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cau_hoi_trac_nghiem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lan_lam_trac_nghiem" (
    "id" TEXT NOT NULL,
    "baiId" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "hocVienId" TEXT NOT NULL,
    "batDauLuc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nopLuc" TIMESTAMP(3),
    "traLoi" JSONB,
    "soCauDung" INTEGER,
    "tongSoCau" INTEGER,
    "diem" DECIMAL(4,2),

    CONSTRAINT "lan_lam_trac_nghiem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yeu_cau_san_pham" (
    "id" TEXT NOT NULL,
    "hocPhanId" TEXT NOT NULL,
    "tieuDe" TEXT NOT NULL,
    "moTa" TEXT,
    "tinhDiem" BOOLEAN NOT NULL DEFAULT false,
    "heSo" DECIMAL(4,2) NOT NULL DEFAULT 1,
    "thuTu" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yeu_cau_san_pham_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bai_nop_san_pham" (
    "id" TEXT NOT NULL,
    "yeuCauId" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "hocVienId" TEXT NOT NULL,
    "tenFile" TEXT NOT NULL,
    "loaiFile" TEXT NOT NULL,
    "kichThuoc" INTEGER NOT NULL,
    "khoaLuuTru" TEXT NOT NULL,
    "ghiChu" TEXT,
    "nopLuc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diem" DECIMAL(4,2),
    "nhanXet" TEXT,
    "nguoiCham" TEXT,
    "chamLuc" TIMESTAMP(3),

    CONSTRAINT "bai_nop_san_pham_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hoc_lieu_hoc_phan_khoaLuuTru_key" ON "hoc_lieu_hoc_phan"("khoaLuuTru");

-- CreateIndex
CREATE INDEX "hoc_lieu_hoc_phan_hocPhanId_idx" ON "hoc_lieu_hoc_phan"("hocPhanId");

-- CreateIndex
CREATE INDEX "bai_trac_nghiem_hocPhanId_idx" ON "bai_trac_nghiem"("hocPhanId");

-- CreateIndex
CREATE INDEX "cau_hoi_trac_nghiem_baiId_idx" ON "cau_hoi_trac_nghiem"("baiId");

-- CreateIndex
CREATE INDEX "lan_lam_trac_nghiem_baiId_khoaId_hocVienId_idx" ON "lan_lam_trac_nghiem"("baiId", "khoaId", "hocVienId");

-- CreateIndex
CREATE INDEX "yeu_cau_san_pham_hocPhanId_idx" ON "yeu_cau_san_pham"("hocPhanId");

-- CreateIndex
CREATE UNIQUE INDEX "bai_nop_san_pham_khoaLuuTru_key" ON "bai_nop_san_pham"("khoaLuuTru");

-- CreateIndex
CREATE UNIQUE INDEX "bai_nop_san_pham_yeuCauId_khoaId_hocVienId_key" ON "bai_nop_san_pham"("yeuCauId", "khoaId", "hocVienId");

-- AddForeignKey
ALTER TABLE "hoc_lieu_hoc_phan" ADD CONSTRAINT "hoc_lieu_hoc_phan_hocPhanId_fkey" FOREIGN KEY ("hocPhanId") REFERENCES "hoc_phan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bai_trac_nghiem" ADD CONSTRAINT "bai_trac_nghiem_hocPhanId_fkey" FOREIGN KEY ("hocPhanId") REFERENCES "hoc_phan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cau_hoi_trac_nghiem" ADD CONSTRAINT "cau_hoi_trac_nghiem_baiId_fkey" FOREIGN KEY ("baiId") REFERENCES "bai_trac_nghiem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lan_lam_trac_nghiem" ADD CONSTRAINT "lan_lam_trac_nghiem_baiId_fkey" FOREIGN KEY ("baiId") REFERENCES "bai_trac_nghiem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lan_lam_trac_nghiem" ADD CONSTRAINT "lan_lam_trac_nghiem_khoaId_fkey" FOREIGN KEY ("khoaId") REFERENCES "khoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lan_lam_trac_nghiem" ADD CONSTRAINT "lan_lam_trac_nghiem_hocVienId_fkey" FOREIGN KEY ("hocVienId") REFERENCES "hoc_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yeu_cau_san_pham" ADD CONSTRAINT "yeu_cau_san_pham_hocPhanId_fkey" FOREIGN KEY ("hocPhanId") REFERENCES "hoc_phan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bai_nop_san_pham" ADD CONSTRAINT "bai_nop_san_pham_yeuCauId_fkey" FOREIGN KEY ("yeuCauId") REFERENCES "yeu_cau_san_pham"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bai_nop_san_pham" ADD CONSTRAINT "bai_nop_san_pham_khoaId_fkey" FOREIGN KEY ("khoaId") REFERENCES "khoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bai_nop_san_pham" ADD CONSTRAINT "bai_nop_san_pham_hocVienId_fkey" FOREIGN KEY ("hocVienId") REFERENCES "hoc_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

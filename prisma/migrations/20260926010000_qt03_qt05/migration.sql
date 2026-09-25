-- CreateTable
CREATE TABLE "nhat_ky_thao_tac" (
    "id" TEXT NOT NULL,
    "thoiGian" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nguoiThucHienId" TEXT,
    "nguoiThucHienTen" TEXT NOT NULL,
    "hanhDong" TEXT NOT NULL,
    "doiTuong" TEXT NOT NULL,
    "doiTuongId" TEXT NOT NULL,
    "chiTiet" TEXT,

    CONSTRAINT "nhat_ky_thao_tac_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tham_so_he_thong" (
    "id" TEXT NOT NULL,
    "ma" TEXT NOT NULL,
    "giaTri" TEXT NOT NULL,
    "moTa" TEXT,
    "capNhatLuc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tham_so_he_thong_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nhat_ky_thao_tac_doiTuong_doiTuongId_idx" ON "nhat_ky_thao_tac"("doiTuong", "doiTuongId");

-- CreateIndex
CREATE UNIQUE INDEX "tham_so_he_thong_ma_key" ON "tham_so_he_thong"("ma");


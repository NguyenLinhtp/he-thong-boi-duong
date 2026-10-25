-- CreateTable
CREATE TABLE "gia_han_danh_gia" (
    "id" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "hocVienId" TEXT NOT NULL,
    "mucKey" TEXT NOT NULL,
    "soLanThem" INTEGER NOT NULL DEFAULT 0,
    "moNopLai" BOOLEAN NOT NULL DEFAULT false,
    "hanDen" TIMESTAMP(3),
    "lyDo" TEXT NOT NULL,
    "nguoiCap" TEXT NOT NULL,
    "capNhatLuc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gia_han_danh_gia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gia_han_danh_gia_khoaId_hocVienId_mucKey_key" ON "gia_han_danh_gia"("khoaId", "hocVienId", "mucKey");

-- AddForeignKey
ALTER TABLE "gia_han_danh_gia" ADD CONSTRAINT "gia_han_danh_gia_hocVienId_fkey" FOREIGN KEY ("hocVienId") REFERENCES "hoc_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

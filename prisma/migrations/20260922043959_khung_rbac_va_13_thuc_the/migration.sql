-- CreateEnum
CREATE TYPE "VaiTro" AS ENUM ('ADMIN', 'CAN_BO_QUAN_LY_DAO_TAO', 'CAN_BO_TAI_CHINH', 'GIANG_VIEN', 'HOC_VIEN', 'CAN_BO_DON_VI_LIEN_KET');

-- CreateEnum
CREATE TYPE "TrangThaiTaiKhoan" AS ENUM ('HOAT_DONG', 'TAM_KHOA');

-- CreateEnum
CREATE TYPE "PhuongThucDangKy" AS ENUM ('TRUC_TUYEN_NOP_GIAY', 'IMPORT_TU_XAC_NHAN', 'CHI_DU_THI', 'QUA_DON_VI_LIEN_KET');

-- CreateEnum
CREATE TYPE "TrangThaiChuongTrinh" AS ENUM ('DU_THAO', 'CHO_THAM_DINH', 'DA_BAN_HANH', 'NGUNG_HIEU_LUC');

-- CreateEnum
CREATE TYPE "HinhThucGiangDay" AS ENUM ('TRUC_TIEP', 'TRUC_TUYEN');

-- CreateEnum
CREATE TYPE "TrangThaiKhoa" AS ENUM ('CHUAN_BI', 'DANG_TUYEN_SINH', 'DANG_DIEN_RA', 'DA_KET_THUC', 'HUY');

-- CreateEnum
CREATE TYPE "TrangThaiDangKy" AS ENUM ('CHO_DUYET', 'HOP_LE', 'KHONG_HOP_LE', 'CHINH_THUC', 'HOAN_THANH', 'THOI_HOC');

-- CreateEnum
CREATE TYPE "TrangThaiDiemDanh" AS ENUM ('CO_MAT', 'VANG_CO_PHEP', 'VANG_KHONG_PHEP');

-- CreateEnum
CREATE TYPE "TrangThaiHocPhi" AS ENUM ('CHUA_NOP', 'DA_NOP_DU', 'CON_NO', 'MIEN_GIAM', 'CHO_THANH_LY_HOP_DONG', 'DA_HOAN_TAT');

-- CreateEnum
CREATE TYPE "TrangThaiHopDong" AS ENUM ('DANG_TRIEN_KHAI', 'DA_THANH_LY');

-- CreateEnum
CREATE TYPE "TrangThaiChungChi" AS ENUM ('CHO_KY_DUYET', 'DA_KY_DUYET', 'DA_CAP');

-- CreateTable
CREATE TABLE "nguoi_dung" (
    "id" TEXT NOT NULL,
    "tenDangNhap" TEXT NOT NULL,
    "matKhauHash" TEXT NOT NULL,
    "hoTen" TEXT NOT NULL,
    "email" TEXT,
    "soCCCD" TEXT,
    "maSoHocVien" TEXT,
    "trangThai" "TrangThaiTaiKhoan" NOT NULL DEFAULT 'HOAT_DONG',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nguoi_dung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vai_tro" (
    "id" TEXT NOT NULL,
    "ma" "VaiTro" NOT NULL,
    "tenHienThi" TEXT NOT NULL,
    "ghiChu" TEXT,

    CONSTRAINT "vai_tro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nguoi_dung_vai_tro" (
    "nguoiDungId" TEXT NOT NULL,
    "vaiTroId" TEXT NOT NULL,

    CONSTRAINT "nguoi_dung_vai_tro_pkey" PRIMARY KEY ("nguoiDungId","vaiTroId")
);

-- CreateTable
CREATE TABLE "chuc_nang_he_thong" (
    "id" TEXT NOT NULL,
    "maCN" TEXT NOT NULL,
    "nhomChucNang" TEXT NOT NULL,
    "tenChucNang" TEXT NOT NULL,

    CONSTRAINT "chuc_nang_he_thong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vai_tro_chuc_nang" (
    "vaiTroId" TEXT NOT NULL,
    "chucNangHeThongId" TEXT NOT NULL,

    CONSTRAINT "vai_tro_chuc_nang_pkey" PRIMARY KEY ("vaiTroId","chucNangHeThongId")
);

-- CreateTable
CREATE TABLE "don_vi" (
    "id" TEXT NOT NULL,
    "ma" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "donViChaId" TEXT,

    CONSTRAINT "don_vi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chuc_danh_hoc_vi" (
    "id" TEXT NOT NULL,
    "ma" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "loai" TEXT NOT NULL,

    CONSTRAINT "chuc_danh_hoc_vi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loai_hinh_boi_duong" (
    "id" TEXT NOT NULL,
    "ma" TEXT NOT NULL,
    "ten" TEXT NOT NULL,

    CONSTRAINT "loai_hinh_boi_duong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phong_hoc" (
    "id" TEXT NOT NULL,
    "ma" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "coSo" TEXT,
    "sucChua" INTEGER,

    CONSTRAINT "phong_hoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dot_tuyen_sinh" (
    "id" TEXT NOT NULL,
    "ma" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "ngayBatDau" TIMESTAMP(3) NOT NULL,
    "ngayKetThuc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dot_tuyen_sinh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chuong_trinh" (
    "id" TEXT NOT NULL,
    "maCT" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "mucTieu" TEXT,
    "doiTuongApDung" TEXT,
    "tongThoiLuong" INTEGER,
    "loaiHinhBoiDuongId" TEXT NOT NULL,
    "phuongThucDangKy" "PhuongThucDangKy",
    "trangThai" "TrangThaiChuongTrinh" NOT NULL DEFAULT 'DU_THAO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chuong_trinh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hoc_phan" (
    "id" TEXT NOT NULL,
    "chuongTrinhId" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "soTiet" INTEGER NOT NULL,
    "thuTu" INTEGER NOT NULL,

    CONSTRAINT "hoc_phan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "khoa" (
    "id" TEXT NOT NULL,
    "maKhoa" TEXT NOT NULL,
    "chuongTrinhId" TEXT NOT NULL,
    "dotTuyenSinhId" TEXT,
    "thoiGianKhaiGiang" TIMESTAMP(3),
    "thoiGianBeGiang" TIMESTAMP(3),
    "siSoToiDa" INTEGER NOT NULL,
    "hinhThucGiangDay" "HinhThucGiangDay" NOT NULL DEFAULT 'TRUC_TIEP',
    "mucHocPhi" DECIMAL(12,2),
    "trangThai" "TrangThaiKhoa" NOT NULL DEFAULT 'CHUAN_BI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "khoa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "giang_vien" (
    "id" TEXT NOT NULL,
    "nguoiDungId" TEXT,
    "hoTen" TEXT NOT NULL,
    "donViId" TEXT,
    "chucDanhHocViId" TEXT,
    "chuyenMon" TEXT,

    CONSTRAINT "giang_vien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "giang_vien_hoc_phan" (
    "id" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "hocPhanId" TEXT NOT NULL,
    "giangVienId" TEXT NOT NULL,

    CONSTRAINT "giang_vien_hoc_phan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hoc_vien" (
    "id" TEXT NOT NULL,
    "nguoiDungId" TEXT,
    "maHocVien" TEXT NOT NULL,
    "hoTen" TEXT NOT NULL,
    "ngaySinh" TIMESTAMP(3),
    "donViCongTac" TEXT,
    "soCCCD" TEXT,
    "soDienThoai" TEXT,
    "email" TEXT,

    CONSTRAINT "hoc_vien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dang_ky_hoc" (
    "id" TEXT NOT NULL,
    "hocVienId" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "ngayDangKy" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trangThai" "TrangThaiDangKy" NOT NULL DEFAULT 'CHO_DUYET',
    "hopDongLienKetId" TEXT,

    CONSTRAINT "dang_ky_hoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buoi_hoc" (
    "id" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "hocPhanId" TEXT,
    "ngayHoc" TIMESTAMP(3) NOT NULL,
    "gioBatDau" TEXT,
    "gioKetThuc" TEXT,
    "phongHocId" TEXT,
    "linkTrucTuyen" TEXT,

    CONSTRAINT "buoi_hoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diem_danh" (
    "id" TEXT NOT NULL,
    "buoiHocId" TEXT NOT NULL,
    "hocVienId" TEXT NOT NULL,
    "giangVienId" TEXT,
    "trangThai" "TrangThaiDiemDanh" NOT NULL DEFAULT 'VANG_KHONG_PHEP',

    CONSTRAINT "diem_danh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ket_qua_hoc_tap" (
    "id" TEXT NOT NULL,
    "hocVienId" TEXT NOT NULL,
    "hocPhanId" TEXT NOT NULL,
    "diemThanhPhan" DECIMAL(4,2),
    "diemKetThuc" DECIMAL(4,2),
    "dat" BOOLEAN,
    "daPheDuyet" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ket_qua_hoc_tap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hoc_phi" (
    "id" TEXT NOT NULL,
    "hocVienId" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "soTienPhaiNop" DECIMAL(12,2) NOT NULL,
    "soTienDaNop" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ngayNop" TIMESTAMP(3),
    "hinhThucNop" TEXT,
    "trangThai" "TrangThaiHocPhi" NOT NULL DEFAULT 'CHUA_NOP',
    "nguoiXacNhanId" TEXT,

    CONSTRAINT "hoc_phi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chung_chi" (
    "id" TEXT NOT NULL,
    "soHieu" TEXT,
    "hocVienId" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "ngayCap" TIMESTAMP(3),
    "nguoiKy" TEXT,
    "soVaoSo" TEXT,
    "kenhNhan" TEXT,
    "trangThai" "TrangThaiChungChi" NOT NULL DEFAULT 'CHO_KY_DUYET',

    CONSTRAINT "chung_chi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "don_vi_lien_ket" (
    "id" TEXT NOT NULL,
    "ma" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "diaChi" TEXT,
    "nguoiDaiDien" TEXT,
    "soDienThoai" TEXT,
    "taiKhoanId" TEXT,

    CONSTRAINT "don_vi_lien_ket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hop_dong_lien_ket" (
    "id" TEXT NOT NULL,
    "maHopDong" TEXT NOT NULL,
    "donViLienKetId" TEXT NOT NULL,
    "khoaId" TEXT NOT NULL,
    "soLuongDuKien" INTEGER,
    "soLuongThucTe" INTEGER,
    "donGiaThoaThuan" DECIMAL(12,2),
    "trangThai" "TrangThaiHopDong" NOT NULL DEFAULT 'DANG_TRIEN_KHAI',
    "ngayQuyetToan" TIMESTAMP(3),
    "soTienQuyetToan" DECIMAL(12,2),

    CONSTRAINT "hop_dong_lien_ket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nguoi_dung_tenDangNhap_key" ON "nguoi_dung"("tenDangNhap");

-- CreateIndex
CREATE UNIQUE INDEX "nguoi_dung_email_key" ON "nguoi_dung"("email");

-- CreateIndex
CREATE UNIQUE INDEX "nguoi_dung_soCCCD_key" ON "nguoi_dung"("soCCCD");

-- CreateIndex
CREATE UNIQUE INDEX "nguoi_dung_maSoHocVien_key" ON "nguoi_dung"("maSoHocVien");

-- CreateIndex
CREATE UNIQUE INDEX "vai_tro_ma_key" ON "vai_tro"("ma");

-- CreateIndex
CREATE UNIQUE INDEX "chuc_nang_he_thong_maCN_key" ON "chuc_nang_he_thong"("maCN");

-- CreateIndex
CREATE UNIQUE INDEX "don_vi_ma_key" ON "don_vi"("ma");

-- CreateIndex
CREATE UNIQUE INDEX "chuc_danh_hoc_vi_ma_key" ON "chuc_danh_hoc_vi"("ma");

-- CreateIndex
CREATE UNIQUE INDEX "loai_hinh_boi_duong_ma_key" ON "loai_hinh_boi_duong"("ma");

-- CreateIndex
CREATE UNIQUE INDEX "phong_hoc_ma_key" ON "phong_hoc"("ma");

-- CreateIndex
CREATE UNIQUE INDEX "dot_tuyen_sinh_ma_key" ON "dot_tuyen_sinh"("ma");

-- CreateIndex
CREATE UNIQUE INDEX "chuong_trinh_maCT_key" ON "chuong_trinh"("maCT");

-- CreateIndex
CREATE UNIQUE INDEX "khoa_maKhoa_key" ON "khoa"("maKhoa");

-- CreateIndex
CREATE UNIQUE INDEX "giang_vien_nguoiDungId_key" ON "giang_vien"("nguoiDungId");

-- CreateIndex
CREATE UNIQUE INDEX "giang_vien_hoc_phan_khoaId_hocPhanId_key" ON "giang_vien_hoc_phan"("khoaId", "hocPhanId");

-- CreateIndex
CREATE UNIQUE INDEX "hoc_vien_nguoiDungId_key" ON "hoc_vien"("nguoiDungId");

-- CreateIndex
CREATE UNIQUE INDEX "hoc_vien_maHocVien_key" ON "hoc_vien"("maHocVien");

-- CreateIndex
CREATE UNIQUE INDEX "hoc_vien_soCCCD_key" ON "hoc_vien"("soCCCD");

-- CreateIndex
CREATE UNIQUE INDEX "dang_ky_hoc_hocVienId_khoaId_key" ON "dang_ky_hoc"("hocVienId", "khoaId");

-- CreateIndex
CREATE UNIQUE INDEX "diem_danh_buoiHocId_hocVienId_key" ON "diem_danh"("buoiHocId", "hocVienId");

-- CreateIndex
CREATE UNIQUE INDEX "ket_qua_hoc_tap_hocVienId_hocPhanId_key" ON "ket_qua_hoc_tap"("hocVienId", "hocPhanId");

-- CreateIndex
CREATE UNIQUE INDEX "hoc_phi_hocVienId_khoaId_key" ON "hoc_phi"("hocVienId", "khoaId");

-- CreateIndex
CREATE UNIQUE INDEX "chung_chi_soHieu_key" ON "chung_chi"("soHieu");

-- CreateIndex
CREATE UNIQUE INDEX "don_vi_lien_ket_ma_key" ON "don_vi_lien_ket"("ma");

-- CreateIndex
CREATE UNIQUE INDEX "don_vi_lien_ket_taiKhoanId_key" ON "don_vi_lien_ket"("taiKhoanId");

-- CreateIndex
CREATE UNIQUE INDEX "hop_dong_lien_ket_maHopDong_key" ON "hop_dong_lien_ket"("maHopDong");

-- AddForeignKey
ALTER TABLE "nguoi_dung_vai_tro" ADD CONSTRAINT "nguoi_dung_vai_tro_nguoiDungId_fkey" FOREIGN KEY ("nguoiDungId") REFERENCES "nguoi_dung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nguoi_dung_vai_tro" ADD CONSTRAINT "nguoi_dung_vai_tro_vaiTroId_fkey" FOREIGN KEY ("vaiTroId") REFERENCES "vai_tro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vai_tro_chuc_nang" ADD CONSTRAINT "vai_tro_chuc_nang_vaiTroId_fkey" FOREIGN KEY ("vaiTroId") REFERENCES "vai_tro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vai_tro_chuc_nang" ADD CONSTRAINT "vai_tro_chuc_nang_chucNangHeThongId_fkey" FOREIGN KEY ("chucNangHeThongId") REFERENCES "chuc_nang_he_thong"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "don_vi" ADD CONSTRAINT "don_vi_donViChaId_fkey" FOREIGN KEY ("donViChaId") REFERENCES "don_vi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chuong_trinh" ADD CONSTRAINT "chuong_trinh_loaiHinhBoiDuongId_fkey" FOREIGN KEY ("loaiHinhBoiDuongId") REFERENCES "loai_hinh_boi_duong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hoc_phan" ADD CONSTRAINT "hoc_phan_chuongTrinhId_fkey" FOREIGN KEY ("chuongTrinhId") REFERENCES "chuong_trinh"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "khoa" ADD CONSTRAINT "khoa_chuongTrinhId_fkey" FOREIGN KEY ("chuongTrinhId") REFERENCES "chuong_trinh"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "khoa" ADD CONSTRAINT "khoa_dotTuyenSinhId_fkey" FOREIGN KEY ("dotTuyenSinhId") REFERENCES "dot_tuyen_sinh"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giang_vien" ADD CONSTRAINT "giang_vien_nguoiDungId_fkey" FOREIGN KEY ("nguoiDungId") REFERENCES "nguoi_dung"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giang_vien" ADD CONSTRAINT "giang_vien_donViId_fkey" FOREIGN KEY ("donViId") REFERENCES "don_vi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giang_vien" ADD CONSTRAINT "giang_vien_chucDanhHocViId_fkey" FOREIGN KEY ("chucDanhHocViId") REFERENCES "chuc_danh_hoc_vi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giang_vien_hoc_phan" ADD CONSTRAINT "giang_vien_hoc_phan_khoaId_fkey" FOREIGN KEY ("khoaId") REFERENCES "khoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giang_vien_hoc_phan" ADD CONSTRAINT "giang_vien_hoc_phan_hocPhanId_fkey" FOREIGN KEY ("hocPhanId") REFERENCES "hoc_phan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giang_vien_hoc_phan" ADD CONSTRAINT "giang_vien_hoc_phan_giangVienId_fkey" FOREIGN KEY ("giangVienId") REFERENCES "giang_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hoc_vien" ADD CONSTRAINT "hoc_vien_nguoiDungId_fkey" FOREIGN KEY ("nguoiDungId") REFERENCES "nguoi_dung"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dang_ky_hoc" ADD CONSTRAINT "dang_ky_hoc_hocVienId_fkey" FOREIGN KEY ("hocVienId") REFERENCES "hoc_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dang_ky_hoc" ADD CONSTRAINT "dang_ky_hoc_khoaId_fkey" FOREIGN KEY ("khoaId") REFERENCES "khoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dang_ky_hoc" ADD CONSTRAINT "dang_ky_hoc_hopDongLienKetId_fkey" FOREIGN KEY ("hopDongLienKetId") REFERENCES "hop_dong_lien_ket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buoi_hoc" ADD CONSTRAINT "buoi_hoc_khoaId_fkey" FOREIGN KEY ("khoaId") REFERENCES "khoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buoi_hoc" ADD CONSTRAINT "buoi_hoc_hocPhanId_fkey" FOREIGN KEY ("hocPhanId") REFERENCES "hoc_phan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buoi_hoc" ADD CONSTRAINT "buoi_hoc_phongHocId_fkey" FOREIGN KEY ("phongHocId") REFERENCES "phong_hoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diem_danh" ADD CONSTRAINT "diem_danh_buoiHocId_fkey" FOREIGN KEY ("buoiHocId") REFERENCES "buoi_hoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diem_danh" ADD CONSTRAINT "diem_danh_hocVienId_fkey" FOREIGN KEY ("hocVienId") REFERENCES "hoc_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diem_danh" ADD CONSTRAINT "diem_danh_giangVienId_fkey" FOREIGN KEY ("giangVienId") REFERENCES "giang_vien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ket_qua_hoc_tap" ADD CONSTRAINT "ket_qua_hoc_tap_hocVienId_fkey" FOREIGN KEY ("hocVienId") REFERENCES "hoc_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ket_qua_hoc_tap" ADD CONSTRAINT "ket_qua_hoc_tap_hocPhanId_fkey" FOREIGN KEY ("hocPhanId") REFERENCES "hoc_phan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hoc_phi" ADD CONSTRAINT "hoc_phi_hocVienId_fkey" FOREIGN KEY ("hocVienId") REFERENCES "hoc_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hoc_phi" ADD CONSTRAINT "hoc_phi_khoaId_fkey" FOREIGN KEY ("khoaId") REFERENCES "khoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chung_chi" ADD CONSTRAINT "chung_chi_hocVienId_fkey" FOREIGN KEY ("hocVienId") REFERENCES "hoc_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chung_chi" ADD CONSTRAINT "chung_chi_khoaId_fkey" FOREIGN KEY ("khoaId") REFERENCES "khoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "don_vi_lien_ket" ADD CONSTRAINT "don_vi_lien_ket_taiKhoanId_fkey" FOREIGN KEY ("taiKhoanId") REFERENCES "nguoi_dung"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hop_dong_lien_ket" ADD CONSTRAINT "hop_dong_lien_ket_donViLienKetId_fkey" FOREIGN KEY ("donViLienKetId") REFERENCES "don_vi_lien_ket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hop_dong_lien_ket" ADD CONSTRAINT "hop_dong_lien_ket_khoaId_fkey" FOREIGN KEY ("khoaId") REFERENCES "khoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

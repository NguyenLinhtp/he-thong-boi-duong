import { prisma } from "@/lib/db/prisma";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import { taoTaiKhoan, TenDangNhapTrungError, MatKhauYeuError } from "@/server/services/qt/qt-01-quan-ly-tai-khoan";
import type { NguoiThucHien } from "@/server/services/dvlk/dvlk-01-danh-muc";
import {
  KhongTimThayDonViLienKetError,
  ThieuThongTinDvlkError,
  DonViDaCoTaiKhoanError,
  TaiKhoanKhongHopLeError,
  TaiKhoanKhongPhaiCanBoDonViLienKetError,
  TaiKhoanDaGanDonViKhacError,
  KhongPhaiTaiKhoanDvlkError,
  NgoaiPhamViDonViLienKetError,
} from "@/server/services/dvlk/loi-dvlk";

const HE_THONG: NguoiThucHien = { nguoiThucHienTen: "Hệ thống" };
const VAI_TRO_DVLK = "CAN_BO_DON_VI_LIEN_KET" as const;

export type CapTaiKhoanInput = { tenDangNhap: string; matKhau: string; hoTen: string; email?: string | null };

/**
 * DVLK-02 (Quản trị hệ thống): tạo tài khoản đăng nhập vai trò Cán bộ đơn vị
 * liên kết và gắn cho đơn vị (mỗi đơn vị 1 tài khoản). Chính sách mật khẩu,
 * tên đăng nhập không trùng theo QT-01.
 */
export async function capTaiKhoanDonViLienKet(donViLienKetId: string, input: CapTaiKhoanInput, nguoi: NguoiThucHien = HE_THONG) {
  const donVi = await prisma.donViLienKet.findUnique({ where: { id: donViLienKetId } });
  if (!donVi) throw new KhongTimThayDonViLienKetError();
  if (donVi.taiKhoanId) throw new DonViDaCoTaiKhoanError();
  const tenDangNhap = input.tenDangNhap?.trim();
  const hoTen = input.hoTen?.trim();
  if (!tenDangNhap) throw new ThieuThongTinDvlkError("tên đăng nhập");
  if (!hoTen) throw new ThieuThongTinDvlkError("họ tên cán bộ phụ trách");

  let taiKhoan;
  try {
    taiKhoan = await taoTaiKhoan({
      tenDangNhap,
      matKhau: input.matKhau ?? "",
      hoTen,
      email: input.email?.trim() || undefined,
      vaiTros: [VAI_TRO_DVLK],
    });
  } catch (error) {
    if (error instanceof TenDangNhapTrungError || error instanceof MatKhauYeuError) {
      throw new TaiKhoanKhongHopLeError(error.message);
    }
    throw error;
  }
  await prisma.donViLienKet.update({ where: { id: donViLienKetId }, data: { taiKhoanId: taiKhoan.id } });
  await ghiNhatKy({
    ...nguoi,
    hanhDong: "CAP_TAI_KHOAN_DVLK",
    doiTuong: "DonViLienKet",
    doiTuongId: donViLienKetId,
    chiTiet: `${donVi.ma}: tài khoản ${tenDangNhap}`,
  });
  return taiKhoan;
}

/** DVLK-02: gắn 1 tài khoản đã tạo sẵn ở QT-01 (vai trò Cán bộ đơn vị liên kết) cho đơn vị. */
export async function ganTaiKhoanDonViLienKet(donViLienKetId: string, nguoiDungId: string, nguoi: NguoiThucHien = HE_THONG) {
  const donVi = await prisma.donViLienKet.findUnique({ where: { id: donViLienKetId } });
  if (!donVi) throw new KhongTimThayDonViLienKetError();

  const nguoiDung = await prisma.nguoiDung.findUnique({
    where: { id: nguoiDungId },
    include: { vaiTros: { include: { vaiTro: true } } },
  });
  if (!nguoiDung?.vaiTros.some((v) => v.vaiTro.ma === VAI_TRO_DVLK)) {
    throw new TaiKhoanKhongPhaiCanBoDonViLienKetError();
  }
  const daGanChoDonViKhac = await prisma.donViLienKet.findFirst({
    where: { taiKhoanId: nguoiDungId, id: { not: donViLienKetId } },
  });
  if (daGanChoDonViKhac) throw new TaiKhoanDaGanDonViKhacError();

  const sau = await prisma.donViLienKet.update({ where: { id: donViLienKetId }, data: { taiKhoanId: nguoiDungId } });
  await ghiNhatKy({
    ...nguoi,
    hanhDong: "GAN_TAI_KHOAN_DVLK",
    doiTuong: "DonViLienKet",
    doiTuongId: donViLienKetId,
    chiTiet: `${donVi.ma}: tài khoản ${nguoiDung.tenDangNhap}`,
  });
  return sau;
}

/**
 * DVLK-02: thu hồi tài khoản của đơn vị - bỏ gắn và tạm khóa tài khoản (không
 * xóa, giữ lại để truy vết nhật ký/hồ sơ đã đăng ký hộ).
 */
export async function thuHoiTaiKhoanDonViLienKet(donViLienKetId: string, nguoi: NguoiThucHien = HE_THONG) {
  const donVi = await prisma.donViLienKet.findUnique({ where: { id: donViLienKetId }, include: { taiKhoan: true } });
  if (!donVi) throw new KhongTimThayDonViLienKetError();
  if (!donVi.taiKhoan) throw new ThieuThongTinDvlkError("tài khoản đang gắn với đơn vị");

  await prisma.$transaction([
    prisma.donViLienKet.update({ where: { id: donViLienKetId }, data: { taiKhoanId: null } }),
    prisma.nguoiDung.update({ where: { id: donVi.taiKhoan.id }, data: { trangThai: "TAM_KHOA" } }),
  ]);
  await ghiNhatKy({
    ...nguoi,
    hanhDong: "THU_HOI_TAI_KHOAN_DVLK",
    doiTuong: "DonViLienKet",
    doiTuongId: donViLienKetId,
    chiTiet: `${donVi.ma}: thu hồi và tạm khóa tài khoản ${donVi.taiKhoan.tenDangNhap}`,
  });
}

/** Tài khoản vai trò Cán bộ đơn vị liên kết chưa gắn cho đơn vị nào - để chọn khi gắn. */
export async function danhSachTaiKhoanChuaGan() {
  return prisma.nguoiDung.findMany({
    where: { vaiTros: { some: { vaiTro: { ma: VAI_TRO_DVLK } } }, donViLienKet: null },
    orderBy: { tenDangNhap: "asc" },
  });
}

export async function donViLienKetCuaTaiKhoan(nguoiDungId: string) {
  return prisma.donViLienKet.findUnique({ where: { taiKhoanId: nguoiDungId } });
}

/**
 * DVLK-02 "giới hạn quyền chỉ thao tác trên các khóa được phân công cho đơn vị
 * đó": khóa được phân công = khóa có hợp đồng liên kết với đơn vị. conHieuLuc
 * = chỉ hợp đồng Đang triển khai (được đăng ký thêm học viên, HV-11).
 */
export async function khoaDuocPhanCong(nguoiDungId: string, opts: { conHieuLuc?: boolean } = {}) {
  const donVi = await donViLienKetCuaTaiKhoan(nguoiDungId);
  if (!donVi) return [];
  return prisma.hopDongLienKet.findMany({
    where: { donViLienKetId: donVi.id, ...(opts.conHieuLuc ? { trangThai: "DANG_TRIEN_KHAI" as const } : {}) },
    include: { khoa: { include: { chuongTrinh: true } }, donViLienKet: true },
    orderBy: { maHopDong: "asc" },
  });
}

/**
 * DVLK-02: chặn tài khoản ĐVLK truy cập hợp đồng/khóa của đơn vị khác - "không
 * xem được dữ liệu của khóa/đơn vị khác". Trả về hợp đồng nếu hợp lệ.
 */
export async function kiemTraHopDongThuocTaiKhoan(nguoiDungId: string, hopDongLienKetId: string) {
  const donVi = await donViLienKetCuaTaiKhoan(nguoiDungId);
  if (!donVi) throw new KhongPhaiTaiKhoanDvlkError();
  const hopDong = await prisma.hopDongLienKet.findUnique({
    where: { id: hopDongLienKetId },
    include: { khoa: { include: { chuongTrinh: true } }, donViLienKet: true },
  });
  if (!hopDong || hopDong.donViLienKetId !== donVi.id) throw new NgoaiPhamViDonViLienKetError();
  return hopDong;
}

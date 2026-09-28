import { prisma } from "@/lib/db/prisma";
import {
  KhongTimThayKhoaError,
  KhongKhopDuLieuImportError,
  DaXacNhanThamGiaError,
  KhoaChuaMoXacNhanThamGiaError,
} from "@/server/services/hv/loi-hoc-vien";
import { hocVienCuaTaiKhoan } from "@/server/services/kq/kq-05-tra-cuu";

export type XacNhanThamGiaInput = {
  khoaId: string;
  // CCCD/mã số (cột "CCCD/mã số" của file import HV-03); bỏ trống khi xác
  // nhận bằng tài khoản đang đăng nhập
  soCCCD?: string | null;
  soDienThoai?: string | null;
  email?: string | null;
  ngaySinh?: string | null;
};

const INCLUDE_DANG_KY = { hocVien: true, khoa: { include: { chuongTrinh: true } } } as const;

/**
 * HV-04 (Phương thức 2): học viên tự xác nhận bằng CCCD/mã số hoặc tài khoản
 * cho khóa đã được import sẵn (HV-03) - "chỉ xác nhận được khi CCCD/mã số
 * khớp với dữ liệu đã import". Cửa sổ xác nhận mở khi khóa Đang tuyển sinh,
 * không kiểm tra lại sĩ số vì chỗ đã được giữ từ lúc import.
 * nguoiDungTaiKhoanId: CHỈ lấy từ phiên đăng nhập phía server (không bao giờ
 * từ dữ liệu client gửi lên) - học viên liên kết với tài khoản như KQ-05.
 */
export async function xacNhanThamGia(input: XacNhanThamGiaInput, nguoiDungTaiKhoanId?: string | null) {
  const khoa = await prisma.khoa.findUnique({ where: { id: input.khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (khoa.trangThai !== "DANG_TUYEN_SINH") throw new KhoaChuaMoXacNhanThamGiaError();

  const soCCCD = input.soCCCD?.trim();
  const hocVien = nguoiDungTaiKhoanId
    ? await hocVienCuaTaiKhoan(nguoiDungTaiKhoanId)
    : soCCCD
      ? await prisma.hocVien.findUnique({ where: { soCCCD } })
      : null;
  if (!hocVien) throw new KhongKhopDuLieuImportError();

  const dangKy = await prisma.dangKyHoc.findUnique({
    where: { hocVienId_khoaId: { hocVienId: hocVien.id, khoaId: khoa.id } },
  });
  if (!dangKy) throw new KhongKhopDuLieuImportError();
  if (dangKy.trangThai === "DA_XAC_NHAN_THAM_GIA") throw new DaXacNhanThamGiaError();
  if (dangKy.trangThai !== "CHO_TU_XAC_NHAN") throw new KhongKhopDuLieuImportError();

  // "bổ sung thông tin còn thiếu" - chỉ điền vào chỗ trống, không ghi đè dữ
  // liệu đã có sẵn từ lúc import.
  await prisma.hocVien.update({
    where: { id: hocVien.id },
    data: {
      soDienThoai: hocVien.soDienThoai ?? input.soDienThoai ?? undefined,
      email: hocVien.email ?? input.email ?? undefined,
      ngaySinh: hocVien.ngaySinh ?? (input.ngaySinh ? new Date(input.ngaySinh) : undefined),
    },
  });

  return prisma.dangKyHoc.update({
    where: { id: dangKy.id },
    data: { trangThai: "DA_XAC_NHAN_THAM_GIA" },
    include: INCLUDE_DANG_KY,
  });
}

import { prisma } from "@/lib/db/prisma";
import {
  KhongTimThayKhoaError,
  KhongKhopDuLieuImportError,
  DaXacNhanThamGiaError,
  KhoaChuaMoXacNhanThamGiaError,
} from "@/server/services/hv/loi-hoc-vien";

export type XacNhanThamGiaInput = {
  khoaId: string;
  soCCCD: string;
  soDienThoai?: string | null;
  email?: string | null;
  ngaySinh?: string | null;
};

const INCLUDE_DANG_KY = { hocVien: true, khoa: { include: { chuongTrinh: true } } } as const;

/**
 * HV-04 (Phương thức 2): học viên tự xác nhận bằng CCCD/mã số cho khóa đã
 * được import sẵn (HV-03) - "chỉ xác nhận được khi CCCD/mã số khớp với dữ
 * liệu đã import". Cửa sổ xác nhận mở khi khóa Đang tuyển sinh, không kiểm
 * tra lại sĩ số vì chỗ đã được giữ từ lúc import, không phải đăng ký mới.
 */
export async function xacNhanThamGia(input: XacNhanThamGiaInput) {
  const khoa = await prisma.khoa.findUnique({ where: { id: input.khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (khoa.trangThai !== "DANG_TUYEN_SINH") throw new KhoaChuaMoXacNhanThamGiaError();

  const hocVien = await prisma.hocVien.findUnique({ where: { soCCCD: input.soCCCD } });
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

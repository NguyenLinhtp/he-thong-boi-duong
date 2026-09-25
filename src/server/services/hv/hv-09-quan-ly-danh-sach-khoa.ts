import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { timHoacTaoHocVien, type ThongTinHocVienInput } from "@/server/services/hv/dung-chung";
import {
  KhongTimThayKhoaError,
  KhongTimThayDangKyError,
  DaDangKyKhoaNayError,
  KhongTheXoaHocVienCoKetQuaError,
} from "@/server/services/hv/loi-hoc-vien";

const INCLUDE_DANG_KY = { hocVien: true } as const;

export async function danhSachHocVienTheoKhoa(khoaId: string) {
  return prisma.dangKyHoc.findMany({
    where: { khoaId },
    include: INCLUDE_DANG_KY,
    orderBy: { ngayDangKy: "asc" },
  });
}

/**
 * HV-09: "Học viên đã có điểm/chứng chỉ không được xóa khỏi khóa" - điểm
 * (KetQuaHocTap) gắn theo học phần nên tính chung theo chương trình của
 * khóa (1 học phần có thể dùng lại ở nhiều khóa cùng chương trình); chứng
 * chỉ (ChungChi) gắn thẳng theo khóa.
 */
async function coDiemHoacChungChiOKhoa(
  hocVienId: string,
  khoa: { id: string; chuongTrinhId: string },
): Promise<boolean> {
  const [soKetQua, soChungChi] = await Promise.all([
    prisma.ketQuaHocTap.count({
      where: { hocVienId, hocPhan: { chuongTrinhId: khoa.chuongTrinhId } },
    }),
    prisma.chungChi.count({ where: { hocVienId, khoaId: khoa.id } }),
  ]);
  return soKetQua > 0 || soChungChi > 0;
}

export type ThemHocVienVaoKhoaInput = ThongTinHocVienInput & { khoaId: string; lyDo?: string | null };

/** HV-09: cán bộ chủ động thêm 1 học viên vào khóa (khác luồng tự đăng ký công khai HV-01/03/05). */
export async function themHocVienVaoKhoa(input: ThemHocVienVaoKhoaInput) {
  const khoa = await prisma.khoa.findUnique({ where: { id: input.khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();

  const hocVien = await timHoacTaoHocVien(input);

  try {
    return await prisma.dangKyHoc.create({
      data: { hocVienId: hocVien.id, khoaId: khoa.id, lyDoThayDoi: input.lyDo ?? null },
      include: INCLUDE_DANG_KY,
    });
  } catch (error) {
    const laLoiTrungDangKy =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (laLoiTrungDangKy) throw new DaDangKyKhoaNayError();
    throw error;
  }
}

export async function xoaHocVienKhoiKhoa(dangKyId: string): Promise<void> {
  const dangKy = await prisma.dangKyHoc.findUnique({
    where: { id: dangKyId },
    include: { khoa: true },
  });
  if (!dangKy) throw new KhongTimThayDangKyError();

  if (await coDiemHoacChungChiOKhoa(dangKy.hocVienId, dangKy.khoa)) {
    throw new KhongTheXoaHocVienCoKetQuaError();
  }

  await prisma.dangKyHoc.delete({ where: { id: dangKyId } });
}

/**
 * Chuyển học viên sang khóa khác: xóa đăng ký ở khóa cũ (áp dụng cùng ràng
 * buộc "không xóa khi đã có điểm/chứng chỉ") rồi tạo đăng ký mới ở khóa đích
 * với trạng thái mặc định, thực hiện trong 1 transaction để tránh mất dữ
 * liệu nếu bước tạo mới thất bại.
 */
export async function chuyenHocVienSangKhoa(dangKyId: string, khoaMoiId: string, lyDo?: string | null) {
  const dangKy = await prisma.dangKyHoc.findUnique({ where: { id: dangKyId }, include: { khoa: true } });
  if (!dangKy) throw new KhongTimThayDangKyError();

  const khoaMoi = await prisma.khoa.findUnique({ where: { id: khoaMoiId } });
  if (!khoaMoi) throw new KhongTimThayKhoaError();

  if (await coDiemHoacChungChiOKhoa(dangKy.hocVienId, dangKy.khoa)) {
    throw new KhongTheXoaHocVienCoKetQuaError();
  }

  const daDangKyKhoaMoi = await prisma.dangKyHoc.findUnique({
    where: { hocVienId_khoaId: { hocVienId: dangKy.hocVienId, khoaId: khoaMoiId } },
  });
  if (daDangKyKhoaMoi) throw new DaDangKyKhoaNayError();

  const [, dangKyMoi] = await prisma.$transaction([
    prisma.dangKyHoc.delete({ where: { id: dangKyId } }),
    prisma.dangKyHoc.create({
      data: { hocVienId: dangKy.hocVienId, khoaId: khoaMoiId, lyDoThayDoi: lyDo ?? null },
      include: INCLUDE_DANG_KY,
    }),
  ]);

  return dangKyMoi;
}

/** "Ghi nhận thôi học" khác "xóa" - vẫn giữ lại lịch sử, chỉ đổi trạng thái. */
export async function ghiNhanThoiHoc(dangKyId: string, lyDo?: string | null) {
  const dangKy = await prisma.dangKyHoc.findUnique({ where: { id: dangKyId } });
  if (!dangKy) throw new KhongTimThayDangKyError();

  return prisma.dangKyHoc.update({
    where: { id: dangKyId },
    data: { trangThai: "THOI_HOC", lyDoThayDoi: lyDo ?? null },
    include: INCLUDE_DANG_KY,
  });
}

import { prisma } from "@/lib/db/prisma";
import type { TrangThaiKhoa } from "@/generated/prisma/client";
import { KhongTimThayKhoaError, ChuyenTrangThaiKhoaKhongHopLeError } from "@/server/services/kh/loi-khoa";

/**
 * KH-05: vòng đời khóa theo đúng thứ tự mô tả trong CN - "chuẩn bị mở -> đang
 * tuyển sinh -> đang học -> đã kết thúc"; "hủy" có thể xảy ra ở bất kỳ bước
 * nào trước khi kết thúc. Đã kết thúc/hủy là trạng thái cuối, không chuyển
 * tiếp được nữa.
 */
const CHUYEN_TIEP_HOP_LE: Record<TrangThaiKhoa, TrangThaiKhoa[]> = {
  CHUAN_BI: ["DANG_TUYEN_SINH", "HUY"],
  DANG_TUYEN_SINH: ["DANG_DIEN_RA", "HUY"],
  DANG_DIEN_RA: ["DA_KET_THUC", "HUY"],
  DA_KET_THUC: [],
  HUY: [],
};

export async function chuyenTrangThaiKhoa(khoaId: string, trangThaiMoi: TrangThaiKhoa) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();

  if (khoa.trangThai === trangThaiMoi) return khoa;

  const chuyenDuoc = CHUYEN_TIEP_HOP_LE[khoa.trangThai].includes(trangThaiMoi);
  if (!chuyenDuoc) throw new ChuyenTrangThaiKhoaKhongHopLeError(khoa.trangThai, trangThaiMoi);

  return prisma.khoa.update({ where: { id: khoaId }, data: { trangThai: trangThaiMoi } });
}

/**
 * Sĩ số hiện tại: đếm đăng ký còn "chiếm chỗ" trong khóa - loại trừ đăng ký
 * không hợp lệ (bị từ chối) hoặc đã thôi học (trả lại chỗ).
 */
export async function siSoHienTai(khoaId: string): Promise<number> {
  return prisma.dangKyHoc.count({
    where: { khoaId, trangThai: { notIn: ["KHONG_HOP_LE", "THOI_HOC"] } },
  });
}

export type TinhTrangSiSo = {
  siSoHienTai: number;
  siSoToiDa: number;
  daDayDu: boolean;
};

export async function tinhTrangSiSo(khoaId: string): Promise<TinhTrangSiSo> {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();

  const hienTai = await siSoHienTai(khoaId);
  return { siSoHienTai: hienTai, siSoToiDa: khoa.siSoToiDa, daDayDu: hienTai >= khoa.siSoToiDa };
}

/**
 * KH-05: "Không nhận đăng ký khi sĩ số đã đủ hoặc khóa đã đóng đăng ký" -
 * cổng kiểm tra dùng lại ở HV module (đăng ký học viên) khi được xây dựng.
 * Chỉ khóa đang ở trạng thái "Đang tuyển sinh" mới còn mở đăng ký.
 */
export async function coTheNhanDangKy(khoaId: string): Promise<boolean> {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (khoa.trangThai !== "DANG_TUYEN_SINH") return false;

  const hienTai = await siSoHienTai(khoaId);
  return hienTai < khoa.siSoToiDa;
}

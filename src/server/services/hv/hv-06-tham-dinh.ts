import { prisma } from "@/lib/db/prisma";
import type { TrangThaiDangKy } from "@/generated/prisma/client";
import { KhongTimThayDangKyError, SaiTrangThaiThamDinhError } from "@/server/services/hv/loi-hoc-vien";

const INCLUDE_DANG_KY = { hocVien: true, khoa: { include: { chuongTrinh: true } } } as const;

/** Hồ sơ đã qua bước đăng ký ban đầu của cả 3 phương thức, sẵn sàng thẩm định. */
const TRANG_THAI_SAN_SANG_THAM_DINH: TrangThaiDangKy[] = [
  "DA_NOP_GIAY", // Phương thức 1 (HV-02)
  "DA_XAC_NHAN_THAM_GIA", // Phương thức 2 (HV-04)
  "CHO_DUYET", // Phương thức 3 (HV-05) hoặc mặc định chung
  // cho phép thẩm định lại (sửa kết quả trước khi HV-07 duyệt chính thức)
  "HOP_LE",
  "KHONG_HOP_LE",
];

export type KetQuaThamDinh = "HOP_LE" | "KHONG_HOP_LE";

/**
 * HV-06: "Rà soát tính hợp lệ của hồ sơ theo điều kiện đầu vào của chương
 * trình, áp dụng chung cho cả 3 phương thức đăng ký". Việc kiểm tra minh
 * chứng bắt buộc chưa có hạ tầng lưu trữ minh chứng trong hệ thống - cán bộ
 * tự đánh giá thủ công và ghi lý do (đặc biệt khi từ chối), theo quyết định
 * đã chốt với người dùng khi xây CN này.
 */
export async function thamDinhHoSo(
  dangKyId: string,
  ketQua: KetQuaThamDinh,
  ghiChu?: string | null,
) {
  const dangKy = await prisma.dangKyHoc.findUnique({ where: { id: dangKyId } });
  if (!dangKy) throw new KhongTimThayDangKyError();
  if (!TRANG_THAI_SAN_SANG_THAM_DINH.includes(dangKy.trangThai)) {
    throw new SaiTrangThaiThamDinhError();
  }

  return prisma.dangKyHoc.update({
    where: { id: dangKyId },
    data: { trangThai: ketQua, ghiChuThamDinh: ghiChu ?? null },
    include: INCLUDE_DANG_KY,
  });
}

export async function danhSachChoThamDinh(khoaId: string) {
  return prisma.dangKyHoc.findMany({
    where: { khoaId, trangThai: { in: ["DA_NOP_GIAY", "DA_XAC_NHAN_THAM_GIA", "CHO_DUYET"] } },
    include: { hocVien: true },
    orderBy: { ngayDangKy: "asc" },
  });
}

export async function danhSachDaThamDinh(khoaId: string) {
  return prisma.dangKyHoc.findMany({
    where: { khoaId, trangThai: { in: ["HOP_LE", "KHONG_HOP_LE"] } },
    include: { hocVien: true },
    orderBy: { ngayDangKy: "asc" },
  });
}

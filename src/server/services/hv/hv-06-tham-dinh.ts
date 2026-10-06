import { prisma } from "@/lib/db/prisma";
import { ghiThaoTac, HE_THONG, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";
import type { TrangThaiDangKy } from "@/generated/prisma/client";
import { KhongTimThayDangKyError, SaiTrangThaiThamDinhError, ThieuMinhChungBatBuocError } from "@/server/services/hv/loi-hoc-vien";
import { minhChungConThieu } from "@/server/services/hv/form-dang-ky";

const INCLUDE_DANG_KY = { hocVien: true, khoa: { include: { chuongTrinh: true } } } as const;

/** Hồ sơ đã qua bước đăng ký ban đầu của cả 3 phương thức, sẵn sàng thẩm định. */
export const TRANG_THAI_SAN_SANG_THAM_DINH: TrangThaiDangKy[] = [
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
 * (bổ sung 30/09/2026) minh chứng = trường Tệp bắt buộc của form đăng ký cấu
 * hình: hồ sơ còn thiếu không được đánh giá Hợp lệ (tuChoiHoSoThieuMinhChung
 * từ chối tự động các hồ sơ này).
 */
export async function thamDinhHoSo(
  dangKyId: string,
  ketQua: KetQuaThamDinh,
  ghiChu?: string | null,
  nguoi: NguoiThucHien = HE_THONG,
) {
  const dangKy = await prisma.dangKyHoc.findUnique({ where: { id: dangKyId } });
  if (!dangKy) throw new KhongTimThayDangKyError();
  if (!TRANG_THAI_SAN_SANG_THAM_DINH.includes(dangKy.trangThai)) {
    throw new SaiTrangThaiThamDinhError();
  }
  if (ketQua === "HOP_LE") {
    const thieu = await minhChungConThieu(dangKyId);
    if (thieu.length > 0) throw new ThieuMinhChungBatBuocError(thieu);
  }

  return prisma.$transaction(async (tx) => {
    const sau = await tx.dangKyHoc.update({
      where: { id: dangKyId },
      data: { trangThai: ketQua, ghiChuThamDinh: ghiChu ?? null },
      include: INCLUDE_DANG_KY,
    });
    await ghiThaoTac(
      nguoi,
      "THAM_DINH_HO_SO",
      "DangKyHoc",
      dangKyId,
      `${sau.hocVien.hoTen} (${sau.hocVien.maHocVien}) - khóa ${sau.khoa.maKhoa}: ${dangKy.trangThai} -> ${ketQua}${ghiChu ? ` - ${ghiChu}` : ""}`,
      tx,
    );
    return sau;
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

/** HV-06: "Hồ sơ thiếu minh chứng bắt buộc bị từ chối tự động" - áp cho hồ sơ đang chờ thẩm định của khóa. */
export async function tuChoiHoSoThieuMinhChung(khoaId: string, nguoi: NguoiThucHien = HE_THONG) {
  const dsCho = await danhSachChoThamDinh(khoaId);
  const daTuChoi: string[] = [];
  for (const dk of dsCho) {
    const thieu = await minhChungConThieu(dk.id);
    if (thieu.length === 0) continue;
    await thamDinhHoSo(dk.id, "KHONG_HOP_LE", `Tự động từ chối: thiếu minh chứng bắt buộc (${thieu.join(", ")})`, nguoi);
    daTuChoi.push(dk.hocVien.hoTen);
  }
  return daTuChoi;
}

/** Mã hồ sơ chờ thẩm định còn thiếu minh chứng bắt buộc -> danh sách tên minh chứng thiếu. */
export async function minhChungThieuTheoKhoa(khoaId: string) {
  const ketQua = new Map<string, string[]>();
  for (const dk of await danhSachChoThamDinh(khoaId)) {
    const thieu = await minhChungConThieu(dk.id);
    if (thieu.length > 0) ketQua.set(dk.id, thieu);
  }
  return ketQua;
}

import { prisma } from "@/lib/db/prisma";
import { chuanHoaSoDinhDanh } from "@/server/services/hv/hv-03-danh-sach-sinh-vien";
import { DaDangKyKhoaNayError } from "@/server/services/hv/loi-hoc-vien";

/**
 * (bổ sung 08/10/2026 - HV-01/HV-03/HV-11/HV-12) Khóa mở nhiều phương thức (vd. tự đăng ký + danh
 * sách được cử đi học): trước khi tạo hồ sơ mới, kiểm tra học viên đã tồn tại trong khóa chưa - theo
 * tài khoản/hồ sơ học viên VÀ theo số CCCD (kể cả cách ghi khác: khoảng trắng, chữ thường, thiếu số 0
 * đầu do Excel) - để 1 người không có 2 hồ sơ trong cùng khóa.
 */

export const NHAN_TRANG_THAI_DANG_KY: Record<string, string> = {
  CHO_NOP_GIAY: "Chờ nộp bản giấy",
  DA_NOP_GIAY: "Đã nộp bản giấy - chờ duyệt",
  HUY_QUA_HAN_NOP_GIAY: "Hủy (quá hạn nộp giấy)",
  CHO_TU_XAC_NHAN: "Có tên trong danh sách được cử đi học - chờ xác nhận",
  DA_XAC_NHAN_THAM_GIA: "Đã xác nhận tham gia",
  CHO_DUYET: "Chờ duyệt",
  HOP_LE: "Hợp lệ",
  KHONG_HOP_LE: "Không hợp lệ",
  CHINH_THUC: "Chính thức",
  HOAN_THANH: "Hoàn thành",
  THOI_HOC: "Thôi học",
};

/** Các cách ghi có thể đã lưu của cùng 1 số CCCD/hộ chiếu. */
export function bienTheSoCCCD(so: string | null | undefined): string[] {
  const tho = (so ?? "").trim();
  const chuan = chuanHoaSoDinhDanh(tho);
  if (!chuan) return tho ? [tho] : [];
  const ds = new Set([tho, chuan]);
  if (/^0\d{11}$/.test(chuan)) ds.add(chuan.slice(1));
  return [...ds];
}

export async function timDangKyTrongKhoa(khoaId: string, theo: { hocVienId?: string | null; soCCCD?: string | null }) {
  const cccd = bienTheSoCCCD(theo.soCCCD);
  const dieuKien = [
    ...(theo.hocVienId ? [{ hocVienId: theo.hocVienId }] : []),
    ...(cccd.length ? [{ hocVien: { soCCCD: { in: cccd } } }] : []),
  ];
  if (dieuKien.length === 0) return null;
  return prisma.dangKyHoc.findFirst({ where: { khoaId, OR: dieuKien }, include: { hocVien: true }, orderBy: { ngayDangKy: "asc" } });
}

/** Thông báo "đã tồn tại" theo hồ sơ đang có trong khóa. */
export function thongBaoDaTonTai(dk: { trangThai: string; hocVien: { maHocVien: string; soCCCD: string | null } }) {
  const ai = dk.hocVien.soCCCD ? `Tài khoản/số CCCD ${dk.hocVien.soCCCD}` : "Tài khoản";
  if (dk.trangThai === "CHO_TU_XAC_NHAN") {
    return `${ai} đã tồn tại trong danh sách được cử đi học của khóa này - vui lòng dùng mục "Xác nhận tham gia" thay vì đăng ký mới`;
  }
  return `${ai} đã tồn tại trong khóa học này (hồ sơ ${dk.hocVien.maHocVien}, trạng thái: ${NHAN_TRANG_THAI_DANG_KY[dk.trangThai] ?? dk.trangThai}) - không đăng ký trùng`;
}

/** Chặn tạo hồ sơ mới khi học viên (theo tài khoản hoặc số CCCD) đã tồn tại trong khóa. */
export async function kiemTraChuaCoTrongKhoa(khoaId: string, theo: { hocVienId?: string | null; soCCCD?: string | null }) {
  const dk = await timDangKyTrongKhoa(khoaId, theo);
  if (!dk) return;
  const loi = new DaDangKyKhoaNayError();
  loi.message = thongBaoDaTonTai(dk);
  throw loi;
}

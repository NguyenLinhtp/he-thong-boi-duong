import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { nhanVanBang } from "@/server/services/cc/van-bang";
import { urlGocHeThong } from "@/server/services/qt/url-goc";

/** 16 ký tự hex ngẫu nhiên (64 bit) - không suy ra được từ số hiệu, không dò tuần tự được. */
export function sinhMaXacThuc() {
  return randomBytes(8).toString("hex");
}

/** Link in thành mã QR trên văn bằng - gốc cấu hình ở QT-05 CC_URL_XAC_THUC, không có thì theo gốc hệ thống. */
export async function duongDanXacThuc(maXacThuc: string) {
  const goc = ((await layThamSo("CC_URL_XAC_THUC")) ?? `${await urlGocHeThong()}/xac-thuc-van-bang`).replace(/\/+$/, "");
  return `${goc}/${maXacThuc}`;
}

/** So khớp họ tên không phân biệt hoa/thường, dấu tiếng Việt và khoảng trắng thừa. */
export function chuanHoaHoTen(hoTen: string) {
  return hoTen
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type KetQuaXacThuc =
  | { trangThai: "KHONG_TIM_THAY" }
  | {
      trangThai: "HOP_LE" | "DA_HUY";
      soHieu: string;
      loaiVanBang: string;
      hoTen: string;
      namSinh: number | null;
      tenChuongTrinh: string;
      maKhoa: string;
      thoiGianKhoa: string | null;
      soQuyetDinh: string | null;
      ngayKy: Date | null;
      ngayHuy: Date | null;
      coQuanCap: string;
    };

const INCLUDE = { hocVien: true, khoa: { include: { chuongTrinh: true } } } as const;

/**
 * CC-05: chỉ công bố văn bằng đã ký duyệt/đã cấp (hợp lệ) hoặc đã hủy; văn
 * bằng còn đề nghị/chờ ký coi như chưa phát hành -> không tìm thấy. "Không
 * hiển thị thông tin cá nhân nhạy cảm": chỉ họ tên, năm sinh và thông tin văn
 * bằng - không CCCD, ngày sinh đầy đủ, liên hệ, đơn vị công tác, điểm.
 */
async function ketQua(
  cc: Awaited<ReturnType<typeof timTheoMa>>,
): Promise<KetQuaXacThuc> {
  if (!cc || !cc.soHieu) return { trangThai: "KHONG_TIM_THAY" };
  const hopLe = cc.trangThai === "DA_KY_DUYET" || cc.trangThai === "DA_CAP";
  if (!hopLe && cc.trangThai !== "DA_HUY") return { trangThai: "KHONG_TIM_THAY" };
  const { khoa } = cc;
  return {
    trangThai: hopLe ? "HOP_LE" : "DA_HUY",
    soHieu: cc.soHieu,
    loaiVanBang: nhanVanBang(cc.loaiVanBang),
    hoTen: cc.hocVien.hoTen,
    namSinh: cc.hocVien.ngaySinh ? cc.hocVien.ngaySinh.getFullYear() : null,
    tenChuongTrinh: khoa.chuongTrinh.ten,
    maKhoa: khoa.maKhoa,
    thoiGianKhoa:
      khoa.thoiGianKhaiGiang && khoa.thoiGianBeGiang
        ? `${khoa.thoiGianKhaiGiang.toLocaleDateString("vi-VN")} - ${khoa.thoiGianBeGiang.toLocaleDateString("vi-VN")}`
        : null,
    soQuyetDinh: hopLe ? cc.soQuyetDinh : null,
    ngayKy: hopLe ? cc.ngayCap : null,
    ngayHuy: hopLe ? null : cc.ngayHuy,
    coQuanCap: (await layThamSo("CC_TEN_CO_QUAN_CAP")) ?? "Cơ sở đào tạo, bồi dưỡng",
  };
}

function timTheoMa(maXacThuc: string) {
  return prisma.chungChi.findUnique({ where: { maXacThuc }, include: INCLUDE });
}

/** CC-05 qua mã QR in trên văn bằng. */
export async function xacThucTheoMa(maXacThuc: string): Promise<KetQuaXacThuc> {
  const ma = maXacThuc?.trim().toLowerCase();
  if (!ma || !/^[0-9a-f]{16}$/.test(ma)) return { trangThai: "KHONG_TIM_THAY" };
  return ketQua(await timTheoMa(ma));
}

/**
 * CC-05 tra cứu thủ công: số hiệu + họ tên người được cấp. Bắt buộc họ tên vì
 * số hiệu tăng dần - chỉ cần số hiệu thì dò lần lượt được danh sách người được
 * cấp. Sai họ tên trả về như không tìm thấy (không tiết lộ số hiệu có tồn tại).
 */
export async function traCuuTheoSoHieu(soHieu: string, hoTen: string): Promise<KetQuaXacThuc> {
  const so = soHieu?.trim().toUpperCase();
  if (!so || !hoTen?.trim()) return { trangThai: "KHONG_TIM_THAY" };
  const cc = await prisma.chungChi.findUnique({ where: { soHieu: so }, include: INCLUDE });
  if (!cc || chuanHoaHoTen(cc.hocVien.hoTen) !== chuanHoaHoTen(hoTen)) return { trangThai: "KHONG_TIM_THAY" };
  return ketQua(cc);
}

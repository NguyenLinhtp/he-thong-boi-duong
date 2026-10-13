import { prisma } from "@/lib/db/prisma";
import type { TrangThaiDangKy } from "@/generated/prisma/client";
import { taoBangExcel, type CotXuat } from "@/server/services/chung/bang-tinh";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { dsThanhPhanLePhi } from "@/server/services/hp/hp-01-thanh-phan-le-phi";
import { DA_XONG, TRANG_THAI_CHO_DUYET } from "@/server/services/hp/thanh-phan-le-phi-chung";
import { danhSachChoNopGiay } from "@/server/services/hv/hv-02-xac-nhan-nop-giay";
import { KhongTimThayKhoaError } from "@/server/services/hv/loi-hoc-vien";

/**
 * (bổ sung 12/10/2026 - HV-05/HV-06/HV-07/HV-09) Khóa dự thi chia thành phần lệ phí (vd. Đăng ký ôn
 * thi, Đăng ký thi): tình trạng lệ phí theo từng thành phần để cán bộ đào tạo duyệt, danh sách chính
 * thức tách theo thành phần (thí sinh đã chọn và đã được xác nhận thành phần đó - HV-07), và xuất
 * Excel mọi danh sách của tab Tuyển sinh.
 */

const NHAN_PHI: Record<string, string> = {
  CHUA_NOP: "Chưa đóng",
  CON_NO: "Nộp thiếu",
  DA_NOP_DU: "Đã đóng",
  MIEN_GIAM: "Miễn giảm",
  CHO_THANH_LY_HOP_DONG: "Qua đơn vị liên kết",
  DA_HOAN_TAT: "Đã hoàn tất",
};

const NHAN_TRANG_THAI: Record<string, string> = {
  CHO_NOP_GIAY: "Chờ nộp bản giấy",
  DA_NOP_GIAY: "Đã nộp bản giấy - chờ duyệt",
  HUY_QUA_HAN_NOP_GIAY: "Hủy (quá hạn nộp giấy)",
  CHO_TU_XAC_NHAN: "Chờ tự xác nhận",
  DA_XAC_NHAN_THAM_GIA: "Đã xác nhận tham gia",
  CHO_DUYET: "Chờ duyệt",
  HOP_LE: "Hợp lệ",
  KHONG_HOP_LE: "Không hợp lệ",
  CHINH_THUC: "Chính thức",
  HOAN_THANH: "Hoàn thành",
  THOI_HOC: "Thôi học",
};

export type LePhiThanhPhan = { nhan: string; daXacNhan: boolean };
export type LePhiHocVien = { nhan: string | null; boQua: boolean; thanhPhan: Map<string, LePhiThanhPhan> };

/** Tình trạng lệ phí (chung và từng thành phần) của các học viên trong khóa. Thành phần không chọn thì không có trong map. */
export async function lePhiTheoHocVien(khoaId: string, dsHocVienId: string[]) {
  const dsHocPhi = await prisma.hocPhi.findMany({
    where: { khoaId, hocVienId: { in: dsHocVienId } },
    include: { thanhPhans: true },
  });
  return new Map<string, LePhiHocVien>(
    dsHocPhi.map((hp) => [
      hp.hocVienId,
      {
        nhan: hp.boQuaKiemTra && !DA_XONG.includes(hp.trangThai) ? "Bỏ chặn (HP-06)" : (NHAN_PHI[hp.trangThai] ?? hp.trangThai),
        boQua: hp.boQuaKiemTra,
        thanhPhan: new Map(
          hp.thanhPhans.map((d) => [d.thanhPhanId, { nhan: NHAN_PHI[d.trangThai] ?? d.trangThai, daXacNhan: hp.boQuaKiemTra || DA_XONG.includes(d.trangThai) }]),
        ),
      },
    ]),
  );
}

/** Thí sinh chính thức thuộc danh sách của 1 thành phần: đã chọn và đã được xác nhận thành phần đó (HV-07). */
export function thuocDanhSachThanhPhan(lePhi: LePhiHocVien | undefined, thanhPhanId: string) {
  return lePhi?.thanhPhan.get(thanhPhanId)?.daXacNhan === true;
}

export const TRANG_THAI_CHINH_THUC: TrangThaiDangKy[] = ["CHINH_THUC", "HOAN_THANH", "THOI_HOC"];

export const LOAI_DANH_SACH = {
  "nop-giay": "DANH SÁCH HỒ SƠ CHỜ NỘP BẢN GIẤY",
  "tu-xac-nhan": "DANH SÁCH HỌC VIÊN CHỜ TỰ XÁC NHẬN",
  "thi-sinh": "DANH SÁCH THÍ SINH ĐĂNG KÝ DỰ THI",
  "cho-duyet": "DANH SÁCH HỒ SƠ CHỜ DUYỆT",
  "khong-hop-le": "DANH SÁCH HỒ SƠ KHÔNG HỢP LỆ",
  "chinh-thuc": "DANH SÁCH CHÍNH THỨC",
} as const;
export type LoaiDanhSach = keyof typeof LOAI_DANH_SACH;

async function dangKyTheoLoai(khoaId: string, loai: LoaiDanhSach) {
  const include = { hocVien: true } as const;
  const orderBy = { ngayDangKy: "asc" } as const;
  switch (loai) {
    case "nop-giay":
      // tự hủy hồ sơ quá hạn trước khi xuất như danh sách trên màn hình
      return danhSachChoNopGiay(khoaId);
    case "tu-xac-nhan":
      return prisma.dangKyHoc.findMany({ where: { khoaId, trangThai: "CHO_TU_XAC_NHAN" }, include, orderBy });
    case "thi-sinh":
      return prisma.dangKyHoc.findMany({ where: { khoaId }, include, orderBy });
    case "cho-duyet":
      return prisma.dangKyHoc.findMany({ where: { khoaId, trangThai: { in: [...TRANG_THAI_CHO_DUYET] } }, include, orderBy });
    case "khong-hop-le":
      return prisma.dangKyHoc.findMany({ where: { khoaId, trangThai: "KHONG_HOP_LE" }, include, orderBy });
    case "chinh-thuc":
      return prisma.dangKyHoc.findMany({
        where: { khoaId, trangThai: { in: TRANG_THAI_CHINH_THUC } },
        include,
        orderBy: [{ hocVien: { lopSinhHoat: "asc" } }, { hocVien: { hoTen: "asc" } }],
      });
  }
}

/** Excel 1 danh sách của tab Tuyển sinh; chinh-thuc kèm thanhPhanId = danh sách chính thức của thành phần đó. */
export async function xuatDanhSachTuyenSinh(khoaId: string, loai: LoaiDanhSach, thanhPhanId?: string | null) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, include: { chuongTrinh: true } });
  if (!khoa || !(loai in LOAI_DANH_SACH)) throw new KhongTimThayKhoaError();
  const [dsGoc, dsTp, tenCoQuan] = await Promise.all([dangKyTheoLoai(khoaId, loai), dsThanhPhanLePhi(khoaId), layThamSo("CC_TEN_CO_QUAN_CAP")]);
  const lePhi = await lePhiTheoHocVien(khoaId, dsGoc.map((d) => d.hocVienId));
  const tp = thanhPhanId ? dsTp.find((t) => t.id === thanhPhanId) : undefined;
  if (thanhPhanId && !tp) throw new KhongTimThayKhoaError();
  const ds = tp ? dsGoc.filter((d) => thuocDanhSachThanhPhan(lePhi.get(d.hocVienId), tp.id)) : dsGoc;
  const coLePhi = dsTp.length === 0 && ds.some((d) => lePhi.has(d.hocVienId));

  const cot: CotXuat[] = [
    { tieuDe: "STT", rong: 6 },
    { tieuDe: "Mã hồ sơ", rong: 14 },
    { tieuDe: "Mã sinh viên", rong: 14 },
    { tieuDe: "Họ và tên", rong: 26 },
    { tieuDe: "Ngày sinh", rong: 12 },
    { tieuDe: "Số CCCD/hộ chiếu", rong: 16 },
    { tieuDe: "Lớp sinh hoạt / đơn vị công tác", rong: 24 },
    { tieuDe: "Điện thoại", rong: 13 },
    { tieuDe: "Email", rong: 24 },
    { tieuDe: "Ngày đăng ký", rong: 13 },
    { tieuDe: "Trạng thái", rong: 18 },
    ...dsTp.map((t) => ({ tieuDe: `Lệ phí ${t.ten.toLowerCase()}`, rong: 16 })),
    ...(coLePhi ? [{ tieuDe: "Học phí/lệ phí", rong: 16 }] : []),
    { tieuDe: "Ghi chú", rong: 26 },
  ];
  const tieuDeDs = tp ? `${LOAI_DANH_SACH[loai]} - ${tp.ten.toUpperCase()}` : LOAI_DANH_SACH[loai];
  const noiDung = await taoBangExcel(
    "Danh sách",
    [
      (tenCoQuan ?? "CƠ SỞ ĐÀO TẠO, BỒI DƯỠNG").toUpperCase(),
      tieuDeDs,
      `${khoa.tenKhoa ?? khoa.chuongTrinh.ten} · Mã khóa: ${khoa.maKhoa}`,
      `Tổng số: ${ds.length} · Xuất lúc ${new Date().toLocaleString("vi-VN")}`,
    ],
    cot,
    ds.map((d, i) => {
      const lp = lePhi.get(d.hocVienId);
      return [
        i + 1,
        d.hocVien.maHocVien,
        d.hocVien.maSinhVien ?? "",
        d.hocVien.hoTen,
        d.hocVien.ngaySinh ? d.hocVien.ngaySinh.toLocaleDateString("vi-VN") : "",
        d.hocVien.soCCCD ?? "",
        d.hocVien.lopSinhHoat ?? d.hocVien.donViCongTac ?? "",
        d.soDienThoaiXacThuc ?? d.hocVien.soDienThoai ?? "",
        d.hocVien.email ?? "",
        d.ngayDangKy.toLocaleDateString("vi-VN"),
        NHAN_TRANG_THAI[d.trangThai] ?? d.trangThai,
        ...dsTp.map((t) => lp?.thanhPhan.get(t.id)?.nhan ?? "Không đăng ký"),
        ...(coLePhi ? [lp?.nhan ?? ""] : []),
        d.ghiChuThamDinh ?? d.lyDoThayDoi ?? "",
      ];
    }),
  );
  const duoi = tp ? `-${tp.ten}` : "";
  return { tenFile: `${loai}${duoi}-${khoa.maKhoa}.xlsx`, noiDung };
}

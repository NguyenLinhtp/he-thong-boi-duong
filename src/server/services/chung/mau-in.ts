import type { Prisma } from "@/generated/prisma/client";
import { Prisma as P } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { dinhDangNgay } from "@/lib/dinh-dang";
import {
  BIEN_MAU_BIEN_LAI,
  BIEN_MAU_DON,
  bienKhongHopLe,
  chuanHoaMauBienLai,
  chuanHoaMauDon,
  thayBien,
  type MauBienLai,
  type MauDonDangKy,
} from "@/lib/mau-in";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { ghiThaoTac, type NguoiThucHien } from "@/server/services/qt/qt-03-nhat-ky";

/**
 * (bổ sung 07/10/2026 - HV-01/HV-05/HP-04) Mẫu in đơn đăng ký và biên lai thu tiền:
 * - đơn đăng ký: mẫu của khóa (nếu sửa riêng) -> mẫu của chương trình -> mẫu mặc định;
 * - biên lai thu tiền (mẫu C45-BB): theo chương trình -> mặc định; nội dung in chốt vào
 *   phiếu thu lúc lập (PhieuThu.noiDungIn) để in lại không đổi khi mẫu được sửa sau đó.
 * Mỗi lần lưu mẫu ghi nhật ký kèm toàn bộ nội dung mẫu (tra lại được bản cũ).
 */
export class MauInKhongHopLeError extends Error {
  constructor(lyDo: string) {
    super(`Mẫu in không hợp lệ: ${lyDo}`);
  }
}

type KhoaChoBien = {
  maKhoa: string;
  tenKhoa: string | null;
  thoiGianKhaiGiang: Date | null;
  thoiGianBeGiang: Date | null;
  hanDangKy: Date | null;
  chuongTrinh: { maCT: string; ten: string };
};

// db: dùng được trong transaction (CSDL dev cục bộ chỉ 1 kết nối - không gọi prisma toàn cục giữa transaction)
export async function bienCuaKhoa(khoa: KhoaChoBien, db?: Prisma.TransactionClient): Promise<Record<string, string>> {
  const tenCoQuan = (db ? (await db.thamSoHeThong.findUnique({ where: { ma: "CC_TEN_CO_QUAN_CAP" } }))?.giaTri : await layThamSo("CC_TEN_CO_QUAN_CAP")) ?? "";
  return {
    tenCoQuan,
    tenChuongTrinh: khoa.chuongTrinh.ten,
    maChuongTrinh: khoa.chuongTrinh.maCT,
    tenKhoa: khoa.tenKhoa ?? khoa.chuongTrinh.ten,
    maKhoa: khoa.maKhoa,
    ngayThi: dinhDangNgay(khoa.thoiGianKhaiGiang, ""),
    ngayBeGiang: dinhDangNgay(khoa.thoiGianBeGiang, ""),
    hanDangKy: dinhDangNgay(khoa.hanDangKy, ""),
  };
}

/** Biến mẫu khi xem trước ở trang chương trình (chưa có khóa cụ thể). */
export async function bienMauXemTruoc(ct: { maCT: string; ten: string }): Promise<Record<string, string>> {
  const nam = new Date().getFullYear();
  return bienCuaKhoa({
    maKhoa: `KH${nam}001`,
    tenKhoa: `${ct.ten} - đợt mẫu`,
    thoiGianKhaiGiang: new Date(),
    thoiGianBeGiang: new Date(),
    hanDangKy: new Date(),
    chuongTrinh: ct,
  });
}

export type NguonMau = "KHOA" | "CHUONG_TRINH" | "MAC_DINH";

export async function mauDonHieuLuc(khoaId: string) {
  const khoa = await prisma.khoa.findUniqueOrThrow({ where: { id: khoaId }, include: { chuongTrinh: true } });
  const laDuThi = khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI");
  const luu = khoa.mauDonDangKy ?? khoa.chuongTrinh.mauDonDangKy;
  const nguon: NguonMau = khoa.mauDonDangKy ? "KHOA" : khoa.chuongTrinh.mauDonDangKy ? "CHUONG_TRINH" : "MAC_DINH";
  return { mau: chuanHoaMauDon(luu, laDuThi), nguon, laDuThi, khoa };
}

function kiemTraMauDon(mau: MauDonDangKy) {
  if (!mau.tieuDe.trim()) throw new MauInKhongHopLeError("chưa nhập tiêu đề đơn");
  if (!mau.nhanKy.trim()) throw new MauInKhongHopLeError("chưa nhập chức danh người ký");
  const sai = [mau.tieuDe, mau.kinhGui, mau.canCu, mau.dongDangKy, mau.dongDot, mau.camKet, mau.diaDanh, mau.nhanKy, mau.ghiChu].flatMap((t) =>
    bienKhongHopLe(t, BIEN_MAU_DON),
  );
  if (sai.length > 0) throw new MauInKhongHopLeError(`biến không tồn tại: ${[...new Set(sai)].map((b) => `{{${b}}}`).join(", ")}`);
}

const jsonHoacNull = (v: object | null) => (v === null ? P.DbNull : (v as Prisma.InputJsonValue));

/** Lưu mẫu đơn của chương trình; null = về mẫu mặc định. */
export async function luuMauDonChuongTrinh(chuongTrinhId: string, mauNhap: unknown | null, nguoi: NguoiThucHien) {
  const ct = await prisma.chuongTrinh.findUniqueOrThrow({ where: { id: chuongTrinhId } });
  const mau = mauNhap === null ? null : chuanHoaMauDon(mauNhap, ct.phuongThucDangKys.includes("CHI_DU_THI"));
  if (mau) kiemTraMauDon(mau);
  await prisma.$transaction(async (tx) => {
    await tx.chuongTrinh.update({ where: { id: chuongTrinhId }, data: { mauDonDangKy: jsonHoacNull(mau) } });
    await ghiThaoTac(nguoi, "CAP_NHAT_MAU_DON", "ChuongTrinh", chuongTrinhId, mau ? `${ct.maCT}: ${JSON.stringify(mau)}` : `${ct.maCT}: về mẫu mặc định`, tx);
  });
}

/** Lưu mẫu đơn riêng của khóa; null = dùng lại mẫu của chương trình. */
export async function luuMauDonKhoa(khoaId: string, mauNhap: unknown | null, nguoi: NguoiThucHien) {
  const khoa = await prisma.khoa.findUniqueOrThrow({ where: { id: khoaId }, include: { chuongTrinh: true } });
  const mau = mauNhap === null ? null : chuanHoaMauDon(mauNhap, khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI"));
  if (mau) kiemTraMauDon(mau);
  await prisma.$transaction(async (tx) => {
    await tx.khoa.update({ where: { id: khoaId }, data: { mauDonDangKy: jsonHoacNull(mau) } });
    await ghiThaoTac(nguoi, "CAP_NHAT_MAU_DON", "Khoa", khoaId, mau ? `${khoa.maKhoa}: ${JSON.stringify(mau)}` : `${khoa.maKhoa}: dùng lại mẫu của chương trình`, tx);
  });
}

/** Lưu mẫu biên lai của chương trình; null = về mẫu mặc định. */
export async function luuMauBienLai(chuongTrinhId: string, mauNhap: unknown | null, nguoi: NguoiThucHien) {
  const ct = await prisma.chuongTrinh.findUniqueOrThrow({ where: { id: chuongTrinhId } });
  const mau = mauNhap === null ? null : chuanHoaMauBienLai(mauNhap);
  if (mau) {
    if (!mau.tieuDe.trim()) throw new MauInKhongHopLeError("chưa nhập tiêu đề biên lai");
    if (!mau.noiDungThu.trim()) throw new MauInKhongHopLeError("chưa nhập nội dung thu");
    const sai = Object.values(mau).flatMap((t) => bienKhongHopLe(t, BIEN_MAU_BIEN_LAI));
    if (sai.length > 0) throw new MauInKhongHopLeError(`biến không tồn tại: ${[...new Set(sai)].map((b) => `{{${b}}}`).join(", ")}`);
  }
  await prisma.$transaction(async (tx) => {
    await tx.chuongTrinh.update({ where: { id: chuongTrinhId }, data: { mauBienLai: jsonHoacNull(mau) } });
    await ghiThaoTac(nguoi, "CAP_NHAT_MAU_BIEN_LAI", "ChuongTrinh", chuongTrinhId, mau ? `${ct.maCT}: ${JSON.stringify(mau)}` : `${ct.maCT}: về mẫu mặc định`, tx);
  });
}

/** Nội dung biên lai đã thay biến - lưu vào PhieuThu.noiDungIn khi lập. */
export type NoiDungInBienLai = Omit<MauBienLai, never> & { nguoiNop: string; diaChi: string };

const LA_DIA_CHI = /địa chỉ|hộ khẩu|thường trú|nơi ở|chỗ ở/i;

/** Địa chỉ người nộp: trường "địa chỉ/hộ khẩu" trong form đăng ký, không có thì lớp sinh hoạt/đơn vị công tác. */
export function diaChiNguoiNop(
  hv: { lopSinhHoat: string | null; donViCongTac: string | null },
  thongTinBoSung: unknown,
): string {
  const ds = Array.isArray(thongTinBoSung) ? (thongTinBoSung as { nhan?: string; giaTri?: string }[]) : [];
  const dc = ds.find((m) => m.nhan && LA_DIA_CHI.test(m.nhan) && m.giaTri)?.giaTri;
  if (dc) return dc;
  if (hv.lopSinhHoat) return `Lớp ${hv.lopSinhHoat}`;
  return hv.donViCongTac ?? "";
}

export const tienGon = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

/**
 * Dựng nội dung in của 1 biên lai: mẫu của chương trình + biến của khóa + người nộp.
 * dsMuc rỗng (khoản không chia thành phần) -> nội dung "Lệ phí thi"/"Học phí".
 */
export async function taoNoiDungInBienLai(
  db: Prisma.TransactionClient | typeof prisma,
  hocPhiId: string,
  dsMuc: { noiDung: string; soTien: number }[],
): Promise<NoiDungInBienLai> {
  const hocPhi = await db.hocPhi.findUniqueOrThrow({ where: { id: hocPhiId }, include: { hocVien: true, khoa: { include: { chuongTrinh: true } } } });
  const dangKy = await db.dangKyHoc.findFirst({ where: { khoaId: hocPhi.khoaId, hocVienId: hocPhi.hocVienId }, select: { thongTinBoSung: true } });
  const mau = chuanHoaMauBienLai(hocPhi.khoa.chuongTrinh.mauBienLai);
  const noiDung =
    dsMuc.length === 0
      ? hocPhi.khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI")
        ? "Lệ phí thi"
        : "Học phí"
      : dsMuc.length === 1
        ? dsMuc[0].noiDung
        : dsMuc.map((m) => `${m.noiDung} ${tienGon(m.soTien)}`).join(", ");
  const bien = { ...(await bienCuaKhoa(hocPhi.khoa, db as Prisma.TransactionClient)), noiDung };
  const giuTrong = (t: string) => (t.trim() ? thayBien(t, bien) : "");
  return {
    donVi: giuTrong(mau.donVi),
    maQHNS: giuTrong(mau.maQHNS),
    mauSo: giuTrong(mau.mauSo),
    canCuMau: giuTrong(mau.canCuMau),
    tieuDe: giuTrong(mau.tieuDe),
    quyenSo: giuTrong(mau.quyenSo),
    noiDungThu: giuTrong(mau.noiDungThu),
    loaiTien: giuTrong(mau.loaiTien),
    nhanNguoiNop: giuTrong(mau.nhanNguoiNop),
    nhanNguoiThu: giuTrong(mau.nhanNguoiThu),
    nguoiNop: hocPhi.hocVien.hoTen,
    diaChi: diaChiNguoiNop(hocPhi.hocVien, dangKy?.thongTinBoSung),
  };
}

/** Nội dung in của phiếu thu: bản đã chốt khi lập; phiếu cũ (chưa chốt) dựng theo mẫu hiện hành. */
export async function noiDungInPhieuThu(phieu: {
  hocPhiId: string;
  noiDungIn: unknown;
  chiTiets: { noiDung: string; soTien: unknown }[];
}): Promise<NoiDungInBienLai> {
  if (phieu.noiDungIn && typeof phieu.noiDungIn === "object") return phieu.noiDungIn as NoiDungInBienLai;
  return taoNoiDungInBienLai(
    prisma,
    phieu.hocPhiId,
    phieu.chiTiets.map((c) => ({ noiDung: c.noiDung, soTien: Number(c.soTien) })),
  );
}

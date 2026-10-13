import { prisma } from "@/lib/db/prisma";
import { layThamSoSo } from "@/server/services/qt/qt-05-tham-so";
import {
  KhongTimThayKhoaError,
  DiemKhongHopLeError,
  KetQuaDaPheDuyetError,
} from "@/server/services/kq/loi-ket-qua";

/**
 * Tham số tính điểm - đặc tả không nêu con số cụ thể nên đọc từ QT-05, mặc
 * định theo thông lệ: điểm học phần = 30% thành phần + 70% kết thúc; đạt khi
 * điểm >= 5; chuyên cần tối thiểu 80% số buổi có mặt.
 */
export async function thamSoKetQua(khoaId?: string) {
  const [tyLeThanhPhan, diemDatChung, chuyenCanChung, rieng, chuyenCan] = await Promise.all([
    layThamSoSo("KQ_TY_LE_DIEM_THANH_PHAN", 0.3),
    layThamSoSo("KQ_DIEM_DAT", 5),
    layThamSoSo("KQ_TY_LE_CHUYEN_CAN_TOI_THIEU", 80),
    khoaId ? diemDatRieng(khoaId) : null,
    khoaId ? chuyenCanRieng(khoaId) : null,
  ]);
  return { tyLeThanhPhan, diemDat: rieng?.diemDat ?? diemDatChung, chuyenCanToiThieu: chuyenCan?.chuyenCanToiThieu ?? chuyenCanChung };
}

/** (bổ sung 13/10/2026) Chuyên cần tối thiểu riêng: của khóa, không có thì của chương trình. */
async function chuyenCanRieng(khoaId: string) {
  const khoa = await prisma.khoa.findUnique({
    where: { id: khoaId },
    select: { chuyenCanToiThieu: true, chuongTrinh: { select: { chuyenCanToiThieu: true } } },
  });
  if (khoa?.chuyenCanToiThieu != null) return { chuyenCanToiThieu: Number(khoa.chuyenCanToiThieu), nguon: "KHOA" as const };
  if (khoa?.chuongTrinh.chuyenCanToiThieu != null) return { chuyenCanToiThieu: Number(khoa.chuongTrinh.chuyenCanToiThieu), nguon: "CHUONG_TRINH" as const };
  return null;
}

/** Chuyên cần tối thiểu đang áp dụng cho khóa và nguồn. */
export async function chuyenCanCuaKhoa(khoaId: string) {
  return (await chuyenCanRieng(khoaId)) ?? { chuyenCanToiThieu: await layThamSoSo("KQ_TY_LE_CHUYEN_CAN_TOI_THIEU", 80), nguon: "HE_THONG" as const };
}

/** (bổ sung 13/10/2026) Điểm đạt riêng: của khóa, không có thì của chương trình; null = theo tham số chung. */
async function diemDatRieng(khoaId: string) {
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, select: { diemDat: true, chuongTrinh: { select: { diemDat: true } } } });
  if (khoa?.diemDat != null) return { diemDat: Number(khoa.diemDat), nguon: "KHOA" as const };
  if (khoa?.chuongTrinh.diemDat != null) return { diemDat: Number(khoa.chuongTrinh.diemDat), nguon: "CHUONG_TRINH" as const };
  return null;
}

/** Điều kiện đạt đang áp dụng cho khóa và nguồn của nó (hiển thị ở tab Kết quả). */
export async function dieuKienDatCuaKhoa(khoaId: string) {
  const rieng = await diemDatRieng(khoaId);
  if (rieng) return rieng;
  return { diemDat: await layThamSoSo("KQ_DIEM_DAT", 5), nguon: "HE_THONG" as const };
}

export function kiemTraDiem(diem: number | null | undefined) {
  if (diem === null || diem === undefined) return;
  if (!Number.isFinite(diem) || diem < 0 || diem > 10) throw new DiemKhongHopLeError();
}

export function lamTron2(so: number): number {
  return Math.round(so * 100) / 100;
}

/** Điểm học phần chỉ tính được khi đã có đủ cả 2 đầu điểm. */
export function tinhDiemHocPhan(
  diemThanhPhan: number | null,
  diemKetThuc: number | null,
  tyLeThanhPhan: number,
): number | null {
  if (diemThanhPhan === null || diemKetThuc === null) return null;
  return lamTron2(diemThanhPhan * tyLeThanhPhan + diemKetThuc * (1 - tyLeThanhPhan));
}

export function soHoacNull(giaTri: { toString(): string } | null | undefined): number | null {
  return giaTri === null || giaTri === undefined ? null : Number(giaTri);
}

export async function layKhoaKemChuongTrinh(khoaId: string) {
  const khoa = await prisma.khoa.findUnique({
    where: { id: khoaId },
    include: { chuongTrinh: { include: { hocPhans: { orderBy: { thuTu: "asc" } } } } },
  });
  if (!khoa) throw new KhongTimThayKhoaError();
  return khoa;
}

export function laKhoaChiDuThi(khoa: { chuongTrinh: { phuongThucDangKys: string[] } }) {
  return khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI");
}

/**
 * Học viên được tính kết quả = đang Chính thức (HV-07); sau phê duyệt KQ-04
 * học viên hoàn thành chuyển HOAN_THANH nên vẫn được tính vào danh sách.
 */
export async function hocVienTinhKetQua(khoaId: string) {
  return prisma.dangKyHoc.findMany({
    where: { khoaId, trangThai: { in: ["CHINH_THUC", "HOAN_THANH"] } },
    include: { hocVien: true, hopDongLienKet: true, lop: true },
    orderBy: { hocVien: { hoTen: "asc" } },
  });
}

/** KQ-04: khóa đã phê duyệt kết quả khi có ít nhất 1 kết quả toàn khóa đã duyệt. */
export async function khoaDaPheDuyetKetQua(khoaId: string): Promise<boolean> {
  const soDaDuyet = await prisma.ketQuaKhoa.count({ where: { khoaId, daPheDuyet: true } });
  return soDaDuyet > 0;
}

export async function chanNeuDaPheDuyet(khoaId: string) {
  if (await khoaDaPheDuyetKetQua(khoaId)) throw new KetQuaDaPheDuyetError();
}

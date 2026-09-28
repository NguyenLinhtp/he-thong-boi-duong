import { prisma } from "@/lib/db/prisma";
import { trungLichPhongHoc } from "@/server/services/dm/dm-04-phong-hoc";
import {
  KhongTimThayKhoaError,
  KhongTimThayBuoiHocError,
  TrungLichGiangVienTheoBuoiError,
  TrungPhongHocError,
  LopKhongThuocKhoaError,
  KhoaChiDuThiKhongGiangDayError,
} from "@/server/services/kh/loi-khoa";

export type ThietLapBuoiHocInput = {
  khoaId: string;
  // KH-07: buổi của 1 lớp; null = buổi chung cả khóa
  lopId?: string | null;
  hocPhanId?: string | null;
  ngayHoc: Date | string;
  gioBatDau?: string | null;
  gioKetThuc?: string | null;
  phongHocId?: string | null;
  linkTrucTuyen?: string | null;
};

function ngayThanhChuoi(ngay: Date | string): string {
  return new Date(ngay).toISOString().slice(0, 10);
}

/** So 2 khung giờ "HH:mm" (chuỗi 24h có padding) có chồng lấn hay không. */
function coTrungGio(aBatDau: string, aKetThuc: string, bBatDau: string, bKetThuc: string): boolean {
  return aBatDau < bKetThuc && bBatDau < aKetThuc;
}

type PhanCongRutGon = { khoaId: string; hocPhanId: string; lopId: string | null; giangVienId: string };

/**
 * KH-07: giảng viên hiệu lực của (khóa, học phần, lớp) = phân công riêng của
 * lớp nếu có, không thì phân công cấp khóa. Buổi chung (lopId null) chỉ dùng
 * phân công cấp khóa.
 */
export function giangVienHieuLuc(
  dsPhanCong: PhanCongRutGon[],
  khoaId: string,
  hocPhanId: string,
  lopId: string | null | undefined,
): string | null {
  const cua = (lop: string | null) =>
    dsPhanCong.find((pc) => pc.khoaId === khoaId && pc.hocPhanId === hocPhanId && pc.lopId === lop);
  return ((lopId ? cua(lopId) : undefined) ?? cua(null))?.giangVienId ?? null;
}

export async function timGiangVienChoHocPhan(
  khoaId: string,
  hocPhanId: string,
  lopId?: string | null,
): Promise<string | null> {
  const dsPhanCong = await prisma.giangVienHocPhan.findMany({ where: { khoaId, hocPhanId } });
  return giangVienHieuLuc(dsPhanCong, khoaId, hocPhanId, lopId);
}

/**
 * Mọi buổi học (có học phần) mà giảng viên đang là người phụ trách hiệu lực,
 * ở các khóa chưa hủy - dùng cho kiểm tra trùng lịch (KH-03) và lịch dạy.
 */
async function buoiCuaGiangVien(giangVienId: string, boQuaBuoiHocId?: string) {
  const phanCongCuaGiangVien = await prisma.giangVienHocPhan.findMany({
    // khóa đã hủy không còn "vận hành" nên không tính là chiếm lịch giảng viên
    where: { giangVienId, khoa: { trangThai: { not: "HUY" } } },
  });
  const capKhoaHocPhan = [
    ...new Map(
      phanCongCuaGiangVien.map((pc) => [`${pc.khoaId}|${pc.hocPhanId}`, { khoaId: pc.khoaId, hocPhanId: pc.hocPhanId }]),
    ).values(),
  ];
  if (capKhoaHocPhan.length === 0) return [];

  const [dsPhanCong, dsBuoi] = await Promise.all([
    prisma.giangVienHocPhan.findMany({ where: { OR: capKhoaHocPhan } }),
    prisma.buoiHoc.findMany({
      where: { id: boQuaBuoiHocId ? { not: boQuaBuoiHocId } : undefined, OR: capKhoaHocPhan },
      include: { khoa: { include: { chuongTrinh: true } }, hocPhan: true, phongHoc: true, lop: true },
      orderBy: [{ ngayHoc: "asc" }, { gioBatDau: "asc" }],
    }),
  ]);
  return dsBuoi.filter(
    (bh) => giangVienHieuLuc(dsPhanCong, bh.khoaId, bh.hocPhanId!, bh.lopId) === giangVienId,
  );
}

async function kiemTraLopThuocKhoa(khoaId: string, lopId: string | null | undefined) {
  if (!lopId) return;
  const lop = await prisma.lopHoc.findUnique({ where: { id: lopId } });
  if (!lop || lop.khoaId !== khoaId) throw new LopKhongThuocKhoaError();
}

/**
 * KH-03: "Không trùng lịch giảng viên" - giảng viên được xác định gián tiếp
 * qua phân công học phần/khóa (KH-02), BuoiHoc không lưu giangVienId riêng.
 * Chỉ kiểm tra khi buổi học có đủ học phần + khung giờ, học phần đó đã có
 * giảng viên phụ trách, và buổi so sánh cũng có đủ khung giờ - thiếu dữ
 * liệu ở 1 trong 2 phía thì chưa đủ căn cứ để chặn.
 */
async function kiemTraTrungLichGiangVien(
  input: ThietLapBuoiHocInput,
  boQuaBuoiHocId?: string,
) {
  if (!input.hocPhanId || !input.gioBatDau || !input.gioKetThuc) return;

  const giangVienId = await timGiangVienChoHocPhan(input.khoaId, input.hocPhanId, input.lopId);
  if (!giangVienId) return;

  const ngay = ngayThanhChuoi(input.ngayHoc);
  const buoiHocKhac = await buoiCuaGiangVien(giangVienId, boQuaBuoiHocId);

  // buổi đã hủy (GD-03) không còn chiếm lịch giảng viên
  const trung = buoiHocKhac.some(
    (bh) =>
      !bh.daHuy &&
      bh.gioBatDau !== null &&
      bh.gioKetThuc !== null &&
      ngayThanhChuoi(bh.ngayHoc) === ngay &&
      coTrungGio(input.gioBatDau!, input.gioKetThuc!, bh.gioBatDau, bh.gioKetThuc),
  );
  if (trung) throw new TrungLichGiangVienTheoBuoiError();
}

/** KH-03: "Không trùng phòng học" - tái dùng trungLichPhongHoc (DM-04). */
async function kiemTraTrungPhongHoc(input: ThietLapBuoiHocInput, boQuaBuoiHocId?: string) {
  if (!input.phongHocId || !input.gioBatDau || !input.gioKetThuc) return;

  const bi = await trungLichPhongHoc({
    phongHocId: input.phongHocId,
    ngayHoc: new Date(input.ngayHoc),
    gioBatDau: input.gioBatDau,
    gioKetThuc: input.gioKetThuc,
    boQuaBuoiHocId,
  });
  if (bi) throw new TrungPhongHocError();
}

export async function thietLapBuoiHoc(input: ThietLapBuoiHocInput) {
  const khoa = await prisma.khoa.findUnique({ where: { id: input.khoaId }, include: { chuongTrinh: true } });
  if (!khoa) throw new KhongTimThayKhoaError();
  if (khoa.chuongTrinh.phuongThucDangKy === "CHI_DU_THI") throw new KhoaChiDuThiKhongGiangDayError();

  await kiemTraLopThuocKhoa(input.khoaId, input.lopId);
  await kiemTraTrungLichGiangVien(input);
  await kiemTraTrungPhongHoc(input);

  return prisma.buoiHoc.create({
    data: {
      khoaId: input.khoaId,
      lopId: input.lopId || null,
      hocPhanId: input.hocPhanId ?? null,
      ngayHoc: new Date(input.ngayHoc),
      gioBatDau: input.gioBatDau ?? null,
      gioKetThuc: input.gioKetThuc ?? null,
      phongHocId: input.phongHocId ?? null,
      linkTrucTuyen: input.linkTrucTuyen ?? null,
    },
    include: { hocPhan: true, phongHoc: true, lop: true },
  });
}

/**
 * GD-03: cập nhật lịch của 1 buổi học đã có (đổi ngày/giờ/phòng) - kiểm tra
 * lại đúng 2 quy tắc trùng lịch như khi tạo mới, loại trừ chính buổi này ra
 * khỏi tập so sánh (boQuaBuoiHocId).
 */
export async function capNhatBuoiHoc(
  id: string,
  input: Omit<ThietLapBuoiHocInput, "khoaId"> & { lyDoThayDoi?: string | null },
) {
  const buoiHoc = await prisma.buoiHoc.findUnique({ where: { id } });
  if (!buoiHoc) throw new KhongTimThayBuoiHocError();

  // lopId không truyền (vd GD-03 đổi lịch) = giữ nguyên lớp của buổi
  const lopId = input.lopId !== undefined ? input.lopId || null : buoiHoc.lopId;
  const inputDayDu: ThietLapBuoiHocInput = { ...input, lopId, khoaId: buoiHoc.khoaId };
  await kiemTraLopThuocKhoa(buoiHoc.khoaId, lopId);
  await kiemTraTrungLichGiangVien(inputDayDu, id);
  await kiemTraTrungPhongHoc(inputDayDu, id);

  return prisma.buoiHoc.update({
    where: { id },
    data: {
      lopId,
      hocPhanId: input.hocPhanId ?? null,
      ngayHoc: new Date(input.ngayHoc),
      gioBatDau: input.gioBatDau ?? null,
      gioKetThuc: input.gioKetThuc ?? null,
      phongHocId: input.phongHocId ?? null,
      ...(input.lyDoThayDoi !== undefined ? { lyDoThayDoi: input.lyDoThayDoi } : {}),
    },
    include: { hocPhan: true, phongHoc: true, khoa: true },
  });
}

export async function danhSachBuoiHoc(khoaId: string) {
  return prisma.buoiHoc.findMany({
    where: { khoaId },
    include: { hocPhan: true, phongHoc: true, lop: true },
    orderBy: [{ ngayHoc: "asc" }, { gioBatDau: "asc" }],
  });
}

export async function xoaBuoiHoc(id: string) {
  return prisma.buoiHoc.delete({ where: { id } });
}

/**
 * Lịch dạy đầy đủ của 1 giảng viên trên toàn hệ thống (mọi khóa đang vận
 * hành - loại trừ khóa đã hủy), dùng để cán bộ xem trước khi xếp thêm buổi
 * học mới cho giảng viên đó ở KH-03, tránh phải thử-và-bị-chặn.
 */
export async function lichDayGiangVien(giangVienId: string) {
  return buoiCuaGiangVien(giangVienId);
}

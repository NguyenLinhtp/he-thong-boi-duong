import { prisma } from "@/lib/db/prisma";
import { trungLichPhongHoc } from "@/server/services/dm/dm-04-phong-hoc";
import {
  KhongTimThayKhoaError,
  TrungLichGiangVienTheoBuoiError,
  TrungPhongHocError,
} from "@/server/services/kh/loi-khoa";

export type ThietLapBuoiHocInput = {
  khoaId: string;
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

async function timGiangVienChoHocPhan(khoaId: string, hocPhanId: string): Promise<string | null> {
  const phanCong = await prisma.giangVienHocPhan.findUnique({
    where: { khoaId_hocPhanId: { khoaId, hocPhanId } },
  });
  return phanCong?.giangVienId ?? null;
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

  const giangVienId = await timGiangVienChoHocPhan(input.khoaId, input.hocPhanId);
  if (!giangVienId) return;

  const phanCongCuaGiangVien = await prisma.giangVienHocPhan.findMany({
    where: { giangVienId },
  });
  const capKhoaHocPhan = phanCongCuaGiangVien.map((pc) => ({
    khoaId: pc.khoaId,
    hocPhanId: pc.hocPhanId,
  }));
  if (capKhoaHocPhan.length === 0) return;

  const ngay = ngayThanhChuoi(input.ngayHoc);
  const buoiHocKhac = await prisma.buoiHoc.findMany({
    where: {
      id: boQuaBuoiHocId ? { not: boQuaBuoiHocId } : undefined,
      OR: capKhoaHocPhan.map((c) => ({ khoaId: c.khoaId, hocPhanId: c.hocPhanId })),
      gioBatDau: { not: null },
      gioKetThuc: { not: null },
    },
  });

  const trung = buoiHocKhac.some(
    (bh) =>
      ngayThanhChuoi(bh.ngayHoc) === ngay &&
      coTrungGio(input.gioBatDau!, input.gioKetThuc!, bh.gioBatDau!, bh.gioKetThuc!),
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
  const khoa = await prisma.khoa.findUnique({ where: { id: input.khoaId } });
  if (!khoa) throw new KhongTimThayKhoaError();

  await kiemTraTrungLichGiangVien(input);
  await kiemTraTrungPhongHoc(input);

  return prisma.buoiHoc.create({
    data: {
      khoaId: input.khoaId,
      hocPhanId: input.hocPhanId ?? null,
      ngayHoc: new Date(input.ngayHoc),
      gioBatDau: input.gioBatDau ?? null,
      gioKetThuc: input.gioKetThuc ?? null,
      phongHocId: input.phongHocId ?? null,
      linkTrucTuyen: input.linkTrucTuyen ?? null,
    },
    include: { hocPhan: true, phongHoc: true },
  });
}

export async function danhSachBuoiHoc(khoaId: string) {
  return prisma.buoiHoc.findMany({
    where: { khoaId },
    include: { hocPhan: true, phongHoc: true },
    orderBy: [{ ngayHoc: "asc" }, { gioBatDau: "asc" }],
  });
}

export async function xoaBuoiHoc(id: string) {
  return prisma.buoiHoc.delete({ where: { id } });
}

import { prisma } from "@/lib/db/prisma";
import { MaTrungError, DangDuocThamChieuError } from "@/server/services/shared/loi-danh-muc";

export async function danhSachPhongHoc() {
  return prisma.phongHoc.findMany({ orderBy: { ma: "asc" } });
}

async function kiemTraMaTrung(ma: string, boQuaId?: string) {
  const daTonTai = await prisma.phongHoc.findUnique({ where: { ma } });
  if (daTonTai && daTonTai.id !== boQuaId) throw new MaTrungError(ma);
}

export type PhongHocInput = {
  ma: string;
  ten: string;
  coSo?: string | null;
  sucChua?: number | null;
};

export async function taoPhongHoc(input: PhongHocInput) {
  await kiemTraMaTrung(input.ma);
  return prisma.phongHoc.create({ data: input });
}

export async function suaPhongHoc(id: string, input: PhongHocInput) {
  await kiemTraMaTrung(input.ma, id);
  return prisma.phongHoc.update({ where: { id }, data: input });
}

export async function xoaPhongHoc(id: string) {
  const soBuoiHocThamChieu = await prisma.buoiHoc.count({ where: { phongHocId: id } });
  if (soBuoiHocThamChieu > 0) {
    throw new DangDuocThamChieuError(
      "Không thể xóa phòng học đang được dùng cho các buổi học đã lên lịch",
    );
  }
  return prisma.phongHoc.delete({ where: { id } });
}

/**
 * "Không xếp 2 khóa cùng phòng trùng khung giờ" - dùng khi KH-03 (thời khóa
 * biểu) tạo/sửa buổi học tại phòng học trực tiếp. Trả về true nếu khung giờ
 * (ngayHoc + gioBatDau..gioKetThuc dạng "HH:mm") bị trùng với 1 buổi học khác
 * đã xếp cùng phòng.
 */
export async function trungLichPhongHoc(input: {
  phongHocId: string;
  ngayHoc: Date;
  gioBatDau: string;
  gioKetThuc: string;
  boQuaBuoiHocId?: string;
}): Promise<boolean> {
  const cacBuoiCungPhongTrongNgay = await prisma.buoiHoc.findMany({
    where: {
      phongHocId: input.phongHocId,
      ngayHoc: input.ngayHoc,
      // buổi đã hủy (GD-03) trả lại phòng - xếp học bù vào khung giờ đó được
      daHuy: false,
      id: input.boQuaBuoiHocId ? { not: input.boQuaBuoiHocId } : undefined,
    },
  });

  return cacBuoiCungPhongTrongNgay.some((buoi) => {
    if (!buoi.gioBatDau || !buoi.gioKetThuc) return false;
    // 2 khung giờ [a1,a2) và [b1,b2) chồng lấn khi a1 < b2 && b1 < a2
    return buoi.gioBatDau < input.gioKetThuc && input.gioBatDau < buoi.gioKetThuc;
  });
}

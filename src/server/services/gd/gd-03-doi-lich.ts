import { prisma } from "@/lib/db/prisma";
import type { Khoa } from "@/generated/prisma/client";
import {
  capNhatBuoiHoc,
  timGiangVienChoHocPhan,
  type ThietLapBuoiHocInput,
} from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import { KhongTimThayBuoiHocError } from "@/server/services/kh/loi-khoa";
import { guiThongBao, guiThongBaoGiangVien } from "@/server/services/hv/hv-10-thong-bao";
import { ThieuLyDoThayDoiError } from "@/server/services/gd/loi-giang-day";

type BuoiHocVoiKhoa = { id: string; khoaId: string; hocPhanId: string | null; ngayHoc: Date; khoa: Khoa };

/**
 * GD-03: "thông báo gửi học viên/giảng viên" khi có thay đổi lịch - gửi cho
 * mọi học viên Chính thức của khóa và giảng viên phụ trách học phần của
 * buổi (nếu buổi có gắn học phần và đã phân công).
 */
async function thongBaoThayDoiLich(buoiHoc: BuoiHocVoiKhoa, tieuDe: string, noiDung: string) {
  const dsChinhThuc = await prisma.dangKyHoc.findMany({
    where: { khoaId: buoiHoc.khoaId, trangThai: "CHINH_THUC" },
  });
  for (const dk of dsChinhThuc) {
    await guiThongBao(dk.hocVienId, "LICH_HOC_LICH_THI", tieuDe, noiDung);
  }

  if (buoiHoc.hocPhanId) {
    const giangVienId = await timGiangVienChoHocPhan(buoiHoc.khoaId, buoiHoc.hocPhanId);
    if (giangVienId) {
      await guiThongBaoGiangVien(giangVienId, "LICH_HOC_LICH_THI", tieuDe, noiDung);
    }
  }
}

/** GD-03: nghỉ học - hủy hẳn 1 buổi, không tổ chức (khác đổi lịch/học bù). */
export async function huyBuoiHoc(buoiHocId: string, lyDo: string) {
  if (!lyDo?.trim()) throw new ThieuLyDoThayDoiError();

  const buoiHoc = await prisma.buoiHoc.findUnique({
    where: { id: buoiHocId },
    include: { khoa: true },
  });
  if (!buoiHoc) throw new KhongTimThayBuoiHocError();

  const ketQua = await prisma.buoiHoc.update({
    where: { id: buoiHocId },
    data: { daHuy: true, lyDoThayDoi: lyDo },
  });

  await thongBaoThayDoiLich(
    buoiHoc,
    `Buổi học ngày ${new Date(buoiHoc.ngayHoc).toLocaleDateString("vi-VN")} của khóa ${buoiHoc.khoa.maKhoa} đã bị hủy`,
    `Lý do: ${lyDo}`,
  );

  return ketQua;
}

export type DoiLichInput = Omit<ThietLapBuoiHocInput, "khoaId"> & { lyDo: string };

/** GD-03: đổi lịch 1 buổi học đã có sang ngày/giờ/phòng mới, tái kiểm tra không trùng lịch phòng/giảng viên. */
export async function doiLichBuoiHoc(buoiHocId: string, input: DoiLichInput) {
  if (!input.lyDo?.trim()) throw new ThieuLyDoThayDoiError();

  const buoiHocCu = await prisma.buoiHoc.findUnique({
    where: { id: buoiHocId },
    include: { khoa: true },
  });
  if (!buoiHocCu) throw new KhongTimThayBuoiHocError();

  const ketQua = await capNhatBuoiHoc(buoiHocId, { ...input, lyDoThayDoi: input.lyDo });

  await thongBaoThayDoiLich(
    buoiHocCu,
    `Buổi học của khóa ${buoiHocCu.khoa.maKhoa} đã đổi lịch`,
    `Lịch mới: ${new Date(input.ngayHoc).toLocaleDateString("vi-VN")}` +
      (input.gioBatDau && input.gioKetThuc ? ` ${input.gioBatDau}–${input.gioKetThuc}` : "") +
      `. Lý do: ${input.lyDo}`,
  );

  return ketQua;
}

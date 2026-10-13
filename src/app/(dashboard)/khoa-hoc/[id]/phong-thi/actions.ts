"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";
import {
  boSungThiSinh,
  chotDotThi,
  moChotDotThi,
  moThemPhongVaXep,
  suaPhongThi,
  taoDotThi,
  themPhongThi,
  ThieuChoPhongThiError,
  xepPhongThi,
  xoaDotThi,
  xoaPhongThi,
  xoaXepPhongThi,
  type PhongThiInput,
} from "@/server/services/kh/kh-03-phong-thi";
import type { LoaiDotThi } from "@/generated/prisma/client";

// (bổ sung 12/10/2026 - KH-03) lịch thi, phòng thi của khóa dự thi/ôn thi
export type KetQuaPhongThi = { loi?: string; ok?: string; thieuCho?: number; soPhongCanThem?: number } | undefined;

const chu = (fd: FormData, ten: string) => String(fd.get(ten) ?? "").trim();

async function chay(khoaId: string, fn: (nguoi: ReturnType<typeof nguoiTuPhien>) => Promise<string | undefined>): Promise<KetQuaPhongThi> {
  const phien = await requirePermission("KH-03");
  try {
    const ok = await fn(nguoiTuPhien(phien));
    revalidatePath(`/khoa-hoc/${khoaId}/phong-thi`);
    return { ok };
  } catch (error) {
    if (error instanceof ThieuChoPhongThiError) return { loi: error.message, thieuCho: error.thieu, soPhongCanThem: error.soPhongCanThem };
    if (error instanceof Error) return { loi: error.message };
    throw error;
  }
}

const phongTuForm = (fd: FormData): PhongThiInput => ({
  ngay: chu(fd, "ngay") || null,
  ca: chu(fd, "ca") || null,
  gioBatDau: chu(fd, "gioBatDau") || null,
  gioKetThuc: chu(fd, "gioKetThuc") || null,
  phongHocId: chu(fd, "phongHocId") || null,
  diaDiem: chu(fd, "diaDiem") || null,
  sucChua: Number(chu(fd, "sucChua")),
});

export async function taoDotThiAction(khoaId: string, _prev: KetQuaPhongThi, fd: FormData) {
  return chay(khoaId, async (nguoi) => {
    const dot = await taoDotThi(
      khoaId,
      { ten: chu(fd, "ten"), loai: chu(fd, "loai") as LoaiDotThi, thanhPhanId: chu(fd, "thanhPhanId") || null, moTa: chu(fd, "moTa") || null },
      nguoi,
    );
    return `Đã tạo ${dot.ten}`;
  });
}

export async function themPhongThiAction(khoaId: string, dotThiId: string, _prev: KetQuaPhongThi, fd: FormData) {
  return chay(khoaId, async (nguoi) => {
    const so = await themPhongThi(dotThiId, phongTuForm(fd), Number(chu(fd, "soLuong") || "1"), nguoi);
    return `Đã thêm ${so} phòng`;
  });
}

export async function suaPhongThiAction(khoaId: string, phongThiId: string, _prev: KetQuaPhongThi, fd: FormData) {
  return chay(khoaId, async (nguoi) => {
    await suaPhongThi(phongThiId, phongTuForm(fd), nguoi);
    return "Đã lưu";
  });
}

export async function xoaPhongThiAction(khoaId: string, phongThiId: string) {
  return chay(khoaId, async (nguoi) => {
    await xoaPhongThi(phongThiId, nguoi);
    return "Đã xóa phòng";
  });
}

export async function xoaDotThiAction(khoaId: string, dotThiId: string) {
  return chay(khoaId, async (nguoi) => {
    await xoaDotThi(dotThiId, nguoi);
    return "Đã xóa đợt";
  });
}

export async function xepPhongThiAction(khoaId: string, dotThiId: string) {
  return chay(khoaId, async (nguoi) => {
    const kq = await xepPhongThi(dotThiId, nguoi);
    return `Đã xếp ${kq.soThiSinh} thí sinh vào ${kq.soPhongDung} phòng${kq.soPhongTrong > 0 ? ` (còn ${kq.soPhongTrong} phòng trống)` : ""}`;
  });
}

export async function moThemPhongVaXepAction(khoaId: string, dotThiId: string) {
  return chay(khoaId, async (nguoi) => {
    const kq = await moThemPhongVaXep(dotThiId, nguoi);
    return `Đã mở thêm phòng và xếp ${kq.soThiSinh} thí sinh vào ${kq.soPhongDung} phòng`;
  });
}

export async function xoaXepPhongThiAction(khoaId: string, dotThiId: string) {
  return chay(khoaId, async (nguoi) => {
    const so = await xoaXepPhongThi(dotThiId, nguoi);
    return `Đã bỏ ${so} thí sinh khỏi các phòng - sửa phòng rồi bấm Xếp phòng`;
  });
}

export async function chotDotThiAction(khoaId: string, dotThiId: string) {
  return chay(khoaId, async (nguoi) => {
    await chotDotThi(dotThiId, nguoi);
    return "Đã chốt danh sách phòng";
  });
}

export async function moChotDotThiAction(khoaId: string, dotThiId: string, lyDo: string) {
  return chay(khoaId, async (nguoi) => {
    await moChotDotThi(dotThiId, lyDo, nguoi);
    return "Đã mở chốt - có thể xếp lại toàn bộ";
  });
}

export async function boSungThiSinhAction(khoaId: string, dotThiId: string) {
  return chay(khoaId, async (nguoi) => {
    const kq = await boSungThiSinh(dotThiId, nguoi);
    if (kq.soBoSung === 0) return "Không có thí sinh mới cần bổ sung";
    return `Đã bổ sung ${kq.soBoSung} thí sinh vào ${kq.phong}${kq.vuotSucChua > 0 ? ` - vượt sức chứa ${kq.vuotSucChua} chỗ, cân nhắc sửa sức chứa/phòng vật lý` : ""}`;
  });
}

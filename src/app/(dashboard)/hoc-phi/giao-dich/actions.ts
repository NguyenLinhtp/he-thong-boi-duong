"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";
import {
  danhDauDaXuLy,
  ganGiaoDichVaoKhoan,
  taoGiaoDichThuNghiem,
  XuLyGiaoDichError,
} from "@/server/services/hp/hp-02-giao-dich-ngan-hang";
import { ThanhPhanLePhiKhongHopLeError } from "@/server/services/hp/loi-hoc-phi";

// (bổ sung 08/10/2026 - HP-02) cán bộ tài chính xử lý giao dịch chuyển khoản chưa tự ghi nhận được
async function chay(fn: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof XuLyGiaoDichError || error instanceof ThanhPhanLePhiKhongHopLeError) return error.message;
    throw error;
  }
  revalidatePath("/hoc-phi/giao-dich");
  return undefined;
}

export async function ganGiaoDichAction(id: string, maKhoa: string, ma: string) {
  const phien = await requirePermission("HP-02");
  return chay(() => ganGiaoDichVaoKhoan(id, { maKhoa, ma }, nguoiTuPhien(phien)));
}

export async function danhDauDaXuLyAction(id: string, ghiChu: string) {
  const phien = await requirePermission("HP-02");
  return chay(() => danhDauDaXuLy(id, ghiChu, nguoiTuPhien(phien)));
}

export async function giaoDichThuNghiemAction(_truoc: string | undefined, formData: FormData) {
  const phien = await requirePermission("HP-02");
  return chay(() =>
    taoGiaoDichThuNghiem(
      { soTien: Number(String(formData.get("soTien") ?? "").replace(/[^\d]/g, "")), noiDung: String(formData.get("noiDung") ?? "") },
      nguoiTuPhien(phien),
    ),
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { taoChuongTrinh, xoaChuongTrinh } from "@/server/services/ct/ct-01-tao-chuong-trinh";
import { KhongXoaDuocChuongTrinhError, KhongTimThayChuongTrinhError } from "@/server/services/ct/loi-chuong-trinh";
import type { LoaiVanBang } from "@/generated/prisma/client";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

export async function taoChuongTrinhAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const phien = await requirePermission("CT-01");
  const tongThoiLuongRaw = formData.get("tongThoiLuong") as string;

  await taoChuongTrinh({
    ten: String(formData.get("ten")),
    mucTieu: (formData.get("mucTieu") as string) || null,
    doiTuongApDung: (formData.get("doiTuongApDung") as string) || null,
    tongThoiLuong: tongThoiLuongRaw ? Number(tongThoiLuongRaw) : null,
    loaiHinhBoiDuongId: String(formData.get("loaiHinhBoiDuongId")),
    loaiVanBang: formData.get("loaiVanBang") === "CHUNG_NHAN" ? "CHUNG_NHAN" : ("CHUNG_CHI" as LoaiVanBang),
  }, nguoiTuPhien(phien));

  revalidatePath("/chuong-trinh");
  return undefined;
}

/** (bổ sung 07/10/2026 - CT-01) xóa chương trình tạo sai; trả về thông báo lỗi để hiện cho người dùng. */
export async function xoaChuongTrinhAction(id: string, veDanhSach: boolean): Promise<string | undefined> {
  const phien = await requirePermission("CT-01");
  try {
    await xoaChuongTrinh(id, nguoiTuPhien(phien));
  } catch (error) {
    if (error instanceof KhongXoaDuocChuongTrinhError || error instanceof KhongTimThayChuongTrinhError) return error.message;
    throw error;
  }
  revalidatePath("/chuong-trinh");
  if (veDanhSach) redirect("/chuong-trinh");
  return undefined;
}

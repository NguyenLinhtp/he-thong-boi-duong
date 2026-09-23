"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { suaChuongTrinhDuThao } from "@/server/services/ct/ct-01-tao-chuong-trinh";
import { SaiTrangThaiChuongTrinhError } from "@/server/services/ct/loi-chuong-trinh";

export async function suaChuongTrinhAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("CT-01");
  const id = String(formData.get("id"));
  const tongThoiLuongRaw = formData.get("tongThoiLuong") as string;

  try {
    await suaChuongTrinhDuThao(id, {
      ten: String(formData.get("ten")),
      mucTieu: (formData.get("mucTieu") as string) || null,
      doiTuongApDung: (formData.get("doiTuongApDung") as string) || null,
      tongThoiLuong: tongThoiLuongRaw ? Number(tongThoiLuongRaw) : null,
      loaiHinhBoiDuongId: String(formData.get("loaiHinhBoiDuongId")),
    });
  } catch (error) {
    if (error instanceof SaiTrangThaiChuongTrinhError) return error.message;
    throw error;
  }

  revalidatePath(`/chuong-trinh/${id}`);
}

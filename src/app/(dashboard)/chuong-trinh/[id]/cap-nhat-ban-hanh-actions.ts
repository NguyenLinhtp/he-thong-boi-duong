"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import {
  suaChuongTrinhDaBanHanh,
  SuaTruongAnhHuongKhoaDangChayError,
} from "@/server/services/ct/ct-04-cap-nhat-da-ban-hanh";

export async function suaChuongTrinhDaBanHanhAction(
  _prevState: string | undefined,
  formData: FormData,
) {
  await requirePermission("CT-04");
  const id = String(formData.get("id"));
  const tongThoiLuongRaw = formData.get("tongThoiLuong") as string;

  try {
    await suaChuongTrinhDaBanHanh(id, {
      ten: String(formData.get("ten")),
      mucTieu: (formData.get("mucTieu") as string) || null,
      doiTuongApDung: (formData.get("doiTuongApDung") as string) || null,
      tongThoiLuong: tongThoiLuongRaw ? Number(tongThoiLuongRaw) : null,
      loaiHinhBoiDuongId: String(formData.get("loaiHinhBoiDuongId")),
      lyDoSua: (formData.get("lyDoSua") as string) || null,
    });
  } catch (error) {
    if (error instanceof SuaTruongAnhHuongKhoaDangChayError) return error.message;
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/chuong-trinh/${id}`);
  return undefined;
}

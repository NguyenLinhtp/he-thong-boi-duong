"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { thietLapLoaiVanBang, DoiLoaiVanBangKhiDaLapError } from "@/server/services/ct/ct-01-loai-van-bang";
import { SaiTrangThaiChuongTrinhError, KhongTimThayChuongTrinhError } from "@/server/services/ct/loi-chuong-trinh";

export async function thietLapLoaiVanBangAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("CT-01");
  const id = String(formData.get("id"));
  const loaiVanBang = formData.get("loaiVanBang") === "CHUNG_NHAN" ? "CHUNG_NHAN" : "CHUNG_CHI";

  try {
    await thietLapLoaiVanBang(id, loaiVanBang);
  } catch (error) {
    if (
      error instanceof DoiLoaiVanBangKhiDaLapError ||
      error instanceof SaiTrangThaiChuongTrinhError ||
      error instanceof KhongTimThayChuongTrinhError
    ) {
      return error.message;
    }
    throw error;
  }

  revalidatePath(`/chuong-trinh/${id}`);
  return undefined;
}

"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { thietLapPhuongThucDangKy } from "@/server/services/ct/ct-07-phuong-thuc-dang-ky";
import type { PhuongThucDangKy } from "@/generated/prisma/client";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

export async function thietLapPhuongThucDangKyAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const phien = await requirePermission("CT-07");
  const id = String(formData.get("id"));
  const phuongThucDangKy = String(formData.get("phuongThucDangKy")) as PhuongThucDangKy;

  try {
    await thietLapPhuongThucDangKy(id, phuongThucDangKy, nguoiTuPhien(phien));
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/chuong-trinh/${id}`);
  return undefined;
}

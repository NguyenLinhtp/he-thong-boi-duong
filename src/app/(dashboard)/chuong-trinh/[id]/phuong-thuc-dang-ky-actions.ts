"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { thietLapPhuongThucDangKy } from "@/server/services/ct/ct-07-phuong-thuc-dang-ky";
import type { PhuongThucDangKy } from "@/generated/prisma/client";

export async function thietLapPhuongThucDangKyAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("CT-07");
  const id = String(formData.get("id"));
  const phuongThucDangKy = String(formData.get("phuongThucDangKy")) as PhuongThucDangKy;

  try {
    await thietLapPhuongThucDangKy(id, phuongThucDangKy);
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/chuong-trinh/${id}`);
  return undefined;
}

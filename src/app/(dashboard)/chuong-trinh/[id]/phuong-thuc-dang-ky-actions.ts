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
  // (sửa 08/10/2026) chọn nhiều phương thức
  const ds = formData.getAll("phuongThucDangKys").map(String) as PhuongThucDangKy[];

  try {
    await thietLapPhuongThucDangKy(id, ds, (formData.get("lyDo") as string | null) ?? null, nguoiTuPhien(phien));
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/chuong-trinh/${id}`);
  // các khóa của chương trình dùng theo phương thức mới
  revalidatePath("/khoa-hoc", "layout");
  revalidatePath("/khoa", "layout");
  return undefined;
}

"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { ngungHieuLucChuongTrinh } from "@/server/services/ct/ct-06-luu-tru";

function duongDan(id: string) {
  return `/chuong-trinh/${id}`;
}

export async function ngungHieuLucAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("CT-06");
  const id = String(formData.get("id"));
  const lyDo = String(formData.get("lyDo"));

  try {
    await ngungHieuLucChuongTrinh(id, lyDo);
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(duongDan(id));
  return undefined;
}

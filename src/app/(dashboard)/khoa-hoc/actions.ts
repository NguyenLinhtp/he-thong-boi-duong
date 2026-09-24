"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";

export async function khoiTaoKhoaAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("KH-01");
  const mucHocPhiRaw = formData.get("mucHocPhi") as string;
  const thoiGianKhaiGiangRaw = formData.get("thoiGianKhaiGiang") as string;
  const thoiGianBeGiangRaw = formData.get("thoiGianBeGiang") as string;

  try {
    await khoiTaoKhoa({
      chuongTrinhId: String(formData.get("chuongTrinhId")),
      siSoToiDa: Number(formData.get("siSoToiDa")),
      thoiGianKhaiGiang: thoiGianKhaiGiangRaw || null,
      thoiGianBeGiang: thoiGianBeGiangRaw || null,
      mucHocPhi: mucHocPhiRaw || null,
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath("/khoa-hoc");
  return undefined;
}

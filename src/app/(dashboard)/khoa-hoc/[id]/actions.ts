"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { phanCongGiangVien } from "@/server/services/kh/kh-02-phan-cong-giang-vien";

export async function phanCongGiangVienAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("KH-02");
  const khoaId = String(formData.get("khoaId"));

  try {
    await phanCongGiangVien({
      khoaId,
      hocPhanId: String(formData.get("hocPhanId")),
      giangVienId: String(formData.get("giangVienId")),
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}

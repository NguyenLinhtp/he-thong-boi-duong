"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { capNhatHoSoHocVien, phamViHoSoHocVien } from "@/server/services/hv/hv-08-ho-so-hoc-vien";

export async function capNhatHoSoAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const phien = await requirePermission("HV-08");
  const id = String(formData.get("id"));
  const ngaySinh = String(formData.get("ngaySinh") || "");
  const donViCongTac = String(formData.get("donViCongTac") || "");
  const chucDanhHocViId = String(formData.get("chucDanhHocViId") || "");
  const soCCCD = String(formData.get("soCCCD") || "");
  const soDienThoai = String(formData.get("soDienThoai") || "");
  const email = String(formData.get("email") || "");

  try {
    await capNhatHoSoHocVien(id, {
      hoTen: String(formData.get("hoTen") || "") || undefined,
      ngaySinh: ngaySinh || null,
      donViCongTac: donViCongTac || null,
      chucDanhHocViId: chucDanhHocViId || null,
      soCCCD: soCCCD || null,
      soDienThoai: soDienThoai || null,
      email: email || null,
    }, await phamViHoSoHocVien(phien.userId));
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/hoc-vien/${id}`);
  return undefined;
}

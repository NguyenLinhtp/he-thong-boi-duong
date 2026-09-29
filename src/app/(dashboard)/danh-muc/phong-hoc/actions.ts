"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { taoPhongHoc, xoaPhongHoc } from "@/server/services/dm/dm-04-phong-hoc";
import { MaTrungError, DangDuocThamChieuError } from "@/server/services/shared/loi-danh-muc";

const DUONG_DAN = "/danh-muc/phong-hoc";

export async function taoPhongHocAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("DM-04");
  const sucChuaRaw = formData.get("sucChua") as string;
  try {
    await taoPhongHoc({
      ma: String(formData.get("ma")),
      ten: String(formData.get("ten")),
      coSo: (formData.get("coSo") as string) || null,
      sucChua: sucChuaRaw ? Number(sucChuaRaw) : null,
    });
  } catch (error) {
    if (error instanceof MaTrungError || error instanceof DangDuocThamChieuError) {
      return error.message;
    }
    throw error;
  }
  revalidatePath(DUONG_DAN);
}

// trả thông báo nghiệp vụ thay vì throw: bản production che message của lỗi ném từ server action
export async function xoaPhongHocAction(id: string): Promise<string | undefined> {
  await requirePermission("DM-04");
  try {
    await xoaPhongHoc(id);
  } catch (error) {
    if (error instanceof DangDuocThamChieuError) return error.message;
    throw error;
  }
  revalidatePath(DUONG_DAN);
}

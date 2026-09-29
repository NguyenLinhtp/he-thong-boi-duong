"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import {
  taoChucDanhHocVi,
  xoaChucDanhHocVi,
} from "@/server/services/dm/dm-02-chuc-danh-hoc-vi";
import { MaTrungError, DangDuocThamChieuError } from "@/server/services/shared/loi-danh-muc";

const DUONG_DAN = "/danh-muc/chuc-danh";

export async function taoChucDanhAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("DM-02");
  try {
    await taoChucDanhHocVi({
      ma: String(formData.get("ma")),
      ten: String(formData.get("ten")),
      loai: String(formData.get("loai")),
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
export async function xoaChucDanhAction(id: string): Promise<string | undefined> {
  await requirePermission("DM-02");
  try {
    await xoaChucDanhHocVi(id);
  } catch (error) {
    if (error instanceof DangDuocThamChieuError) return error.message;
    throw error;
  }
  revalidatePath(DUONG_DAN);
}

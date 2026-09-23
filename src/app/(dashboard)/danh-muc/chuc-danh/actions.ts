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

export async function xoaChucDanhAction(id: string) {
  await requirePermission("DM-02");
  await xoaChucDanhHocVi(id);
  revalidatePath(DUONG_DAN);
}

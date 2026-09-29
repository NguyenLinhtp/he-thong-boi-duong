"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import {
  taoLoaiHinhBoiDuong,
  xoaLoaiHinhBoiDuong,
} from "@/server/services/dm/dm-03-loai-hinh-boi-duong";
import { MaTrungError, DangDuocThamChieuError } from "@/server/services/shared/loi-danh-muc";

const DUONG_DAN = "/danh-muc/loai-hinh";

export async function taoLoaiHinhAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("DM-03");
  try {
    await taoLoaiHinhBoiDuong({
      ma: String(formData.get("ma")),
      ten: String(formData.get("ten")),
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
export async function xoaLoaiHinhAction(id: string): Promise<string | undefined> {
  await requirePermission("DM-03");
  try {
    await xoaLoaiHinhBoiDuong(id);
  } catch (error) {
    if (error instanceof DangDuocThamChieuError) return error.message;
    throw error;
  }
  revalidatePath(DUONG_DAN);
}

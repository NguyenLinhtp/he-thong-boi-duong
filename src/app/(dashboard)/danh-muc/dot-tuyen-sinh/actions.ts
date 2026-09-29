"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import {
  taoDotTuyenSinh,
  xoaDotTuyenSinh,
} from "@/server/services/dm/dm-05-dot-tuyen-sinh";
import {
  MaTrungError,
  DangDuocThamChieuError,
  ChongLapThoiGianError,
} from "@/server/services/shared/loi-danh-muc";

const DUONG_DAN = "/danh-muc/dot-tuyen-sinh";

export async function taoDotTuyenSinhAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("DM-05");
  try {
    await taoDotTuyenSinh({
      ma: String(formData.get("ma")),
      ten: String(formData.get("ten")),
      ngayBatDau: new Date(String(formData.get("ngayBatDau"))),
      ngayKetThuc: new Date(String(formData.get("ngayKetThuc"))),
    });
  } catch (error) {
    if (
      error instanceof MaTrungError ||
      error instanceof DangDuocThamChieuError ||
      error instanceof ChongLapThoiGianError
    ) {
      return error.message;
    }
    throw error;
  }
  revalidatePath(DUONG_DAN);
}

// trả thông báo nghiệp vụ thay vì throw: bản production che message của lỗi ném từ server action
export async function xoaDotTuyenSinhAction(id: string): Promise<string | undefined> {
  await requirePermission("DM-05");
  try {
    await xoaDotTuyenSinh(id);
  } catch (error) {
    if (error instanceof DangDuocThamChieuError) return error.message;
    throw error;
  }
  revalidatePath(DUONG_DAN);
}

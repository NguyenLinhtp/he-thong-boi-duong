"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { chayBackupNgay, phucHoiTuBanSaoLuu } from "@/server/services/qt/qt-04-sao-luu";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";
import {
  KhongTimThayBanSaoLuuError,
  BanSaoLuuChuaSanSangError,
  TepSaoLuuKhongHopLeError,
} from "@/server/services/qt/loi-sao-luu";

const DUONG_DAN = "/quan-tri/sao-luu";

export async function chayBackupNgayAction() {
  const phien = await requirePermission("QT-04");
  await chayBackupNgay(phien.hoTen, "THU_CONG");
  revalidatePath(DUONG_DAN);
}

export async function phucHoiAction(_prevState: string | undefined, formData: FormData) {
  const phienPhucHoi = await requirePermission("QT-04");
  const saoLuuId = String(formData.get("saoLuuId"));

  try {
    await phucHoiTuBanSaoLuu(saoLuuId, nguoiTuPhien(phienPhucHoi));
  } catch (error) {
    if (
      error instanceof KhongTimThayBanSaoLuuError ||
      error instanceof BanSaoLuuChuaSanSangError ||
      error instanceof TepSaoLuuKhongHopLeError
    ) {
      return error.message;
    }
    throw error;
  }

  revalidatePath(DUONG_DAN);
}

"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { luuCauHinhChuongTrinh } from "@/server/services/hv/form-dang-ky";
import { CauHinhFormKhongHopLeError } from "@/server/services/hv/loi-hoc-vien";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

// (bổ sung 30/09/2026) form đăng ký của chương trình - cùng người thiết lập phương thức đăng ký (CT-07)
export async function luuFormDangKyChuongTrinhAction(chuongTrinhId: string, cauHinhJson: string): Promise<string | undefined> {
  const phien = await requirePermission("CT-07");
  try {
    await luuCauHinhChuongTrinh(chuongTrinhId, JSON.parse(cauHinhJson), nguoiTuPhien(phien));
  } catch (error) {
    if (error instanceof CauHinhFormKhongHopLeError || error instanceof SyntaxError) return error.message;
    throw error;
  }
  revalidatePath(`/chuong-trinh/${chuongTrinhId}/form-dang-ky`);
  return undefined;
}

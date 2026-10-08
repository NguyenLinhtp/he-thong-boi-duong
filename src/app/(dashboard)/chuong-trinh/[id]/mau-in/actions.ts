"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { luuMauBienLai, luuMauDonChuongTrinh, MauInKhongHopLeError } from "@/server/services/chung/mau-in";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

// (bổ sung 07/10/2026) mẫu đơn đăng ký của chương trình - cùng người cấu hình form đăng ký (CT-07)
export async function luuMauDonChuongTrinhAction(chuongTrinhId: string, json: string | null): Promise<string | undefined> {
  const phien = await requirePermission("CT-07");
  try {
    await luuMauDonChuongTrinh(chuongTrinhId, json === null ? null : JSON.parse(json), nguoiTuPhien(phien));
  } catch (error) {
    if (error instanceof MauInKhongHopLeError || error instanceof SyntaxError) return error.message;
    throw error;
  }
  revalidatePath(`/chuong-trinh/${chuongTrinhId}/mau-in`);
  return undefined;
}

// (bổ sung 07/10/2026) mẫu biên lai thu tiền của chương trình - cán bộ lập phiếu thu (HP-04)
export async function luuMauBienLaiAction(chuongTrinhId: string, json: string | null): Promise<string | undefined> {
  const phien = await requirePermission("HP-04");
  try {
    await luuMauBienLai(chuongTrinhId, json === null ? null : JSON.parse(json), nguoiTuPhien(phien));
  } catch (error) {
    if (error instanceof MauInKhongHopLeError || error instanceof SyntaxError) return error.message;
    throw error;
  }
  revalidatePath(`/chuong-trinh/${chuongTrinhId}/mau-in`);
  return undefined;
}

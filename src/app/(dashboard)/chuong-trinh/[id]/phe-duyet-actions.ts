"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { trinhThamDinh, pheDuyet, traVeDuThao } from "@/server/services/ct/ct-03-phe-duyet";
import { SaiTrangThaiChuongTrinhError } from "@/server/services/ct/loi-chuong-trinh";
import { ChuaSanSangTrinhDuyetError } from "@/server/services/ct/ct-03-phe-duyet";

function duongDan(id: string) {
  return `/chuong-trinh/${id}`;
}

export async function trinhThamDinhAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("CT-03");
  const id = String(formData.get("id"));

  try {
    await trinhThamDinh(id, (formData.get("yKienThamDinh") as string) || null);
  } catch (error) {
    if (error instanceof SaiTrangThaiChuongTrinhError || error instanceof ChuaSanSangTrinhDuyetError) {
      return error.message;
    }
    throw error;
  }

  revalidatePath(duongDan(id));
  return undefined;
}

export async function pheDuyetAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("CT-03");
  const id = String(formData.get("id"));

  try {
    await pheDuyet(id, {
      soQuyetDinh: String(formData.get("soQuyetDinh")),
      yKienThamDinh: (formData.get("yKienThamDinh") as string) || null,
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(duongDan(id));
  return undefined;
}

export async function traVeDuThaoAction(chuongTrinhId: string) {
  await requirePermission("CT-03");
  await traVeDuThao(chuongTrinhId);
  revalidatePath(duongDan(chuongTrinhId));
}

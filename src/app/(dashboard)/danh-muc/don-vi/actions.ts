"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import {
  taoDonVi,
  suaDonVi,
  xoaDonVi,
} from "@/server/services/dm/dm-01-don-vi";
import { MaTrungError, DangDuocThamChieuError } from "@/server/services/shared/loi-danh-muc";

const DUONG_DAN = "/danh-muc/don-vi";

function timLoi(error: unknown) {
  if (error instanceof MaTrungError || error instanceof DangDuocThamChieuError) {
    return error.message;
  }
  throw error;
}

export async function taoDonViAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("DM-01");
  try {
    await taoDonVi({
      ma: String(formData.get("ma")),
      ten: String(formData.get("ten")),
      donViChaId: (formData.get("donViChaId") as string) || null,
    });
  } catch (error) {
    return timLoi(error);
  }
  revalidatePath(DUONG_DAN);
}

export async function suaDonViAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("DM-01");
  try {
    await suaDonVi(String(formData.get("id")), {
      ma: String(formData.get("ma")),
      ten: String(formData.get("ten")),
      donViChaId: (formData.get("donViChaId") as string) || null,
    });
  } catch (error) {
    return timLoi(error);
  }
  revalidatePath(DUONG_DAN);
}

export async function xoaDonViAction(id: string) {
  await requirePermission("DM-01");
  await xoaDonVi(id);
  revalidatePath(DUONG_DAN);
}

"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { capNhatThamSo, xoaThamSo } from "@/server/services/qt/qt-05-tham-so";

const DUONG_DAN = "/quan-tri/tham-so";

export async function capNhatThamSoAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("QT-05");

  const ma = String(formData.get("ma") ?? "").trim();
  const giaTri = String(formData.get("giaTri") ?? "").trim();
  const moTa = String(formData.get("moTa") ?? "").trim();
  if (!ma || !giaTri) return "Mã và giá trị tham số là bắt buộc";

  await capNhatThamSo({
    ma,
    giaTri,
    moTa: moTa || null,
    nguoiThucHienId: phien.userId,
    nguoiThucHienTen: phien.hoTen,
  });

  revalidatePath(DUONG_DAN);
  return undefined;
}

export async function xoaThamSoAction(ma: string) {
  const phien = await requirePermission("QT-05");
  await xoaThamSo(ma, { id: phien.userId, ten: phien.hoTen });
  revalidatePath(DUONG_DAN);
}

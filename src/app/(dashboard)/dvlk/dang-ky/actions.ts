"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { dangKyThayMatDonViLienKet } from "@/server/services/hv/hv-11-dang-ky-thay-mat-dvlk";
import { cauHinhHieuLuc, docDuLieuForm } from "@/server/services/hv/form-dang-ky";

export async function dangKyThayMatAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const phien = await requirePermission("HV-11");

  const khoaId = String(formData.get("khoaId"));

  let dangKy;
  try {
    // (bổ sung 30/09/2026) dữ liệu theo form cấu hình của khóa
    const { cauHinh } = await cauHinhHieuLuc(khoaId);
    dangKy = await dangKyThayMatDonViLienKet(phien.userId, {
      khoaId,
      hoTen: String(formData.get("hoTen") ?? ""),
      soCCCD: String(formData.get("soCCCD") ?? ""),
      duLieuForm: await docDuLieuForm(cauHinh, formData),
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  redirect(`/khoa/${khoa?.maKhoa}/don-dang-ky/${dangKy.id}`);
}

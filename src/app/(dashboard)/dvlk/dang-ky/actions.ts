"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { dangKyThayMatDonViLienKet } from "@/server/services/hv/hv-11-dang-ky-thay-mat-dvlk";

export async function dangKyThayMatAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const phien = await requirePermission("HV-11");

  const khoaId = String(formData.get("khoaId"));
  const soDienThoai = String(formData.get("soDienThoai") || "");
  const email = String(formData.get("email") || "");
  const ngaySinh = String(formData.get("ngaySinh") || "");
  const donViCongTac = String(formData.get("donViCongTac") || "");

  let dangKy;
  try {
    dangKy = await dangKyThayMatDonViLienKet(phien.userId, {
      khoaId,
      hoTen: String(formData.get("hoTen")),
      soCCCD: String(formData.get("soCCCD")),
      soDienThoai: soDienThoai || null,
      email: email || null,
      ngaySinh: ngaySinh || null,
      donViCongTac: donViCongTac || null,
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId } });
  redirect(`/khoa/${khoa?.maKhoa}/don-dang-ky/${dangKy.id}`);
}

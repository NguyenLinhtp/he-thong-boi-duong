"use server";

import { redirect } from "next/navigation";
import { dangKyTrucTuyen } from "@/server/services/hv/hv-01-dang-ky-truc-tuyen";

export async function dangKyTrucTuyenAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const khoaId = String(formData.get("khoaId"));
  const soDienThoai = String(formData.get("soDienThoai") || "");
  const email = String(formData.get("email") || "");
  const ngaySinh = String(formData.get("ngaySinh") || "");
  const donViCongTac = String(formData.get("donViCongTac") || "");

  let dangKy;
  try {
    dangKy = await dangKyTrucTuyen({
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

  redirect(`/khoa/${formData.get("maKhoa")}/don-dang-ky/${dangKy.id}`);
}

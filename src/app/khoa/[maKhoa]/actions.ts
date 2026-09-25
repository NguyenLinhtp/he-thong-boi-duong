"use server";

import { redirect } from "next/navigation";
import { dangKyTrucTuyen } from "@/server/services/hv/hv-01-dang-ky-truc-tuyen";
import { xacNhanThamGia } from "@/server/services/hv/hv-04-tu-xac-nhan";

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

export async function xacNhanThamGiaAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await xacNhanThamGia({
      khoaId: String(formData.get("khoaId")),
      soCCCD: String(formData.get("soCCCD")),
      soDienThoai: String(formData.get("soDienThoai") || "") || null,
      email: String(formData.get("email") || "") || null,
      ngaySinh: String(formData.get("ngaySinh") || "") || null,
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  return "THANH_CONG";
}

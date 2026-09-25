"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import {
  taoDonViLienKet,
  ganTaiKhoanDonViLienKet,
  taoHopDongLienKet,
} from "@/server/services/hv/lien-ket-ho-tro";

const DUONG_DAN = "/quan-tri/don-vi-lien-ket";

// Đây là các thao tác quản trị tối thiểu để HV-11/HV-12 hoạt động được qua
// UI thật (xem ghi chú đầu file lien-ket-ho-tro.ts) - chưa phải CN DVLK-01/
// 02/03 chính thức nên gate tạm qua QT-01 (Quản trị hệ thống), không có mã
// CN riêng cho tới khi làm đúng module DVLK (nhóm 11).

export async function taoDonViLienKetAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("QT-01");

  try {
    await taoDonViLienKet({
      ma: String(formData.get("ma")),
      ten: String(formData.get("ten")),
      diaChi: (formData.get("diaChi") as string) || null,
      nguoiDaiDien: (formData.get("nguoiDaiDien") as string) || null,
      soDienThoai: (formData.get("soDienThoai") as string) || null,
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(DUONG_DAN);
  return undefined;
}

export async function ganTaiKhoanAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("QT-01");

  try {
    await ganTaiKhoanDonViLienKet(
      String(formData.get("donViLienKetId")),
      String(formData.get("nguoiDungId")),
    );
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(DUONG_DAN);
  return undefined;
}

export async function taoHopDongLienKetAction(
  _prevState: string | undefined,
  formData: FormData,
) {
  await requirePermission("QT-01");

  const soLuongDuKien = formData.get("soLuongDuKien");
  const donGiaThoaThuan = formData.get("donGiaThoaThuan");

  try {
    await taoHopDongLienKet({
      maHopDong: String(formData.get("maHopDong")),
      donViLienKetId: String(formData.get("donViLienKetId")),
      khoaId: String(formData.get("khoaId")),
      soLuongDuKien: soLuongDuKien ? Number(soLuongDuKien) : null,
      donGiaThoaThuan: donGiaThoaThuan ? Number(donGiaThoaThuan) : null,
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(DUONG_DAN);
  return undefined;
}

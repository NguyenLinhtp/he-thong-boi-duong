"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { khoiTaoKhoa, xoaKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

export async function khoiTaoKhoaAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const phien = await requirePermission("KH-01");
  const thoiGianKhaiGiangRaw = formData.get("thoiGianKhaiGiang") as string;
  const thoiGianBeGiangRaw = formData.get("thoiGianBeGiang") as string;

  try {
    await khoiTaoKhoa({
      chuongTrinhId: String(formData.get("chuongTrinhId")),
      // (bổ sung 06/10/2026) tên khóa bắt buộc khi khởi tạo trên màn hình
      tenKhoa: String(formData.get("tenKhoa") ?? ""),
      siSoToiDa: Number(formData.get("siSoToiDa")),
      thoiGianKhaiGiang: thoiGianKhaiGiangRaw || null,
      thoiGianBeGiang: thoiGianBeGiangRaw || null,
      hanDangKy: String(formData.get("hanDangKy") ?? "") || null,
    }, nguoiTuPhien(phien));
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath("/khoa-hoc");
  return undefined;
}

/** (bổ sung 06/10/2026 - KH-01) xóa khóa tạo sai - chỉ khi chưa có hồ sơ đăng ký. Trả về thông báo lỗi nếu bị chặn. */
export async function xoaKhoaAction(khoaId: string): Promise<string | undefined> {
  const phien = await requirePermission("KH-01");
  try {
    await xoaKhoa(khoaId, nguoiTuPhien(phien));
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }
  revalidatePath("/khoa-hoc");
  return undefined;
}

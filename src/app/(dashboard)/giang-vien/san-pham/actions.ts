"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { chamSanPham } from "@/server/services/kq/kq-01-danh-gia-truc-tuyen";
import {
  DanhGiaKhongHopLeError,
  KhongDuocLamDanhGiaError,
  KhongPhaiTaiKhoanGiangVienError,
  KhongPhuTrachHocPhanError,
} from "@/server/services/gd/loi-giang-day";

export type KetQuaCham = { loi?: string; ok?: boolean } | undefined;

// KQ-01 (bổ sung 28/09/2026): giảng viên phụ trách chấm sản phẩm cuối khóa (0-10)
export async function chamSanPhamAction(_prev: KetQuaCham, formData: FormData): Promise<KetQuaCham> {
  const phien = await requirePermission("KQ-01");
  const chuoiDiem = String(formData.get("diem") ?? "").trim();
  if (chuoiDiem === "") return { loi: "Nhập điểm trong khoảng 0-10" };
  try {
    await chamSanPham(phien.userId, String(formData.get("baiNopId")), {
      diem: Number(chuoiDiem.replace(",", ".")),
      nhanXet: String(formData.get("nhanXet") ?? ""),
    });
  } catch (error) {
    if (
      error instanceof DanhGiaKhongHopLeError ||
      error instanceof KhongDuocLamDanhGiaError ||
      error instanceof KhongPhaiTaiKhoanGiangVienError ||
      error instanceof KhongPhuTrachHocPhanError
    )
      return { loi: error.message };
    throw error;
  }
  revalidatePath("/giang-vien/san-pham");
  return { ok: true };
}

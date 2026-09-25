"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { giangVienCuaTaiKhoan } from "@/server/services/gd/dung-chung";
import { diemDanhBuoiHoc } from "@/server/services/gd/gd-01-diem-danh";
import { ghiNhatKyBuoiHoc } from "@/server/services/gd/gd-02-nhat-ky";
import { KhongPhaiTaiKhoanGiangVienError } from "@/server/services/gd/loi-giang-day";
import type { TrangThaiDiemDanh } from "@/generated/prisma/client";

function duongDan(buoiHocId: string) {
  return `/giang-vien/buoi-hoc/${buoiHocId}`;
}

async function giangVienDangNhap(nguoiDungId: string) {
  const giangVien = await giangVienCuaTaiKhoan(nguoiDungId);
  if (!giangVien) throw new KhongPhaiTaiKhoanGiangVienError();
  return giangVien;
}

export async function diemDanhAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("GD-01");
  const buoiHocId = String(formData.get("buoiHocId"));
  const dsHocVienId = formData.getAll("hocVienId") as string[];

  try {
    const giangVien = await giangVienDangNhap(phien.userId);
    const danhSach = dsHocVienId.map((hocVienId) => ({
      hocVienId,
      trangThai: String(formData.get(`trangThai_${hocVienId}`)) as TrangThaiDiemDanh,
    }));
    await diemDanhBuoiHoc(giangVien.id, buoiHocId, danhSach);
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(duongDan(buoiHocId));
  return undefined;
}

export async function ghiNhatKyAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("GD-02");
  const buoiHocId = String(formData.get("buoiHocId"));

  try {
    const giangVien = await giangVienDangNhap(phien.userId);
    await ghiNhatKyBuoiHoc(giangVien.id, buoiHocId, {
      noiDungDaGiang: (formData.get("noiDungDaGiang") as string) || null,
      nhanXet: (formData.get("nhanXet") as string) || null,
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(duongDan(buoiHocId));
  return undefined;
}

"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import {
  danhSachHocPhan,
  themHocPhan,
  suaHocPhan,
  xoaHocPhan,
  sapXepHocPhan,
} from "@/server/services/ct/ct-02-hoc-phan";
import { SaiTrangThaiChuongTrinhError } from "@/server/services/ct/loi-chuong-trinh";

function duongDan(chuongTrinhId: string) {
  return `/chuong-trinh/${chuongTrinhId}`;
}

export async function themHocPhanAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("CT-02");
  const chuongTrinhId = String(formData.get("chuongTrinhId"));

  try {
    await themHocPhan(chuongTrinhId, {
      ten: String(formData.get("ten")),
      soTiet: Number(formData.get("soTiet")),
    });
  } catch (error) {
    if (error instanceof SaiTrangThaiChuongTrinhError) return error.message;
    throw error;
  }

  revalidatePath(duongDan(chuongTrinhId));
  return undefined;
}

export async function suaHocPhanAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("CT-02");
  const chuongTrinhId = String(formData.get("chuongTrinhId"));

  try {
    await suaHocPhan(String(formData.get("id")), {
      ten: String(formData.get("ten")),
      soTiet: Number(formData.get("soTiet")),
    });
  } catch (error) {
    if (error instanceof SaiTrangThaiChuongTrinhError) return error.message;
    throw error;
  }

  revalidatePath(duongDan(chuongTrinhId));
  return undefined;
}

export async function xoaHocPhanAction(chuongTrinhId: string, id: string) {
  await requirePermission("CT-02");
  await xoaHocPhan(id);
  revalidatePath(duongDan(chuongTrinhId));
}

export async function diChuyenHocPhanAction(
  chuongTrinhId: string,
  hocPhanId: string,
  huong: "len" | "xuong",
) {
  await requirePermission("CT-02");

  const dsHienTai = await danhSachHocPhan(chuongTrinhId);
  const viTri = dsHienTai.findIndex((hp) => hp.id === hocPhanId);
  const viTriMoi = huong === "len" ? viTri - 1 : viTri + 1;
  if (viTri === -1 || viTriMoi < 0 || viTriMoi >= dsHienTai.length) return;

  const ds = [...dsHienTai];
  [ds[viTri], ds[viTriMoi]] = [ds[viTriMoi], ds[viTri]];

  await sapXepHocPhan(chuongTrinhId, ds.map((hp) => hp.id));
  revalidatePath(duongDan(chuongTrinhId));
}

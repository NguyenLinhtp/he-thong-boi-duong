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
import { SaiTrangThaiChuongTrinhError, KhongTimThayChuongTrinhError } from "@/server/services/ct/loi-chuong-trinh";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

function duongDan(chuongTrinhId: string) {
  return `/chuong-trinh/${chuongTrinhId}`;
}

// lỗi nghiệp vụ trả về để hiện cho người dùng (lỗi trên server action bị ẩn ở môi trường production)
function thongBaoLoi(error: unknown): string {
  if (error instanceof SaiTrangThaiChuongTrinhError || error instanceof KhongTimThayChuongTrinhError) return error.message;
  if (error instanceof Error && error.message === "Không tìm thấy học phần") return error.message;
  throw error;
}

const lyDoTu = (formData: FormData) => (formData.get("lyDo") as string | null) ?? null;

export async function themHocPhanAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("CT-02");
  const chuongTrinhId = String(formData.get("chuongTrinhId"));

  try {
    await themHocPhan(
      chuongTrinhId,
      { ten: String(formData.get("ten")), soTiet: Number(formData.get("soTiet")), lyDo: lyDoTu(formData) },
      nguoiTuPhien(phien),
    );
  } catch (error) {
    return thongBaoLoi(error);
  }

  revalidatePath(duongDan(chuongTrinhId));
  return undefined;
}

export async function suaHocPhanAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("CT-02");
  const chuongTrinhId = String(formData.get("chuongTrinhId"));

  try {
    await suaHocPhan(
      String(formData.get("id")),
      { ten: String(formData.get("ten")), soTiet: Number(formData.get("soTiet")), lyDo: lyDoTu(formData) },
      nguoiTuPhien(phien),
    );
  } catch (error) {
    return thongBaoLoi(error);
  }

  revalidatePath(duongDan(chuongTrinhId));
  return undefined;
}

export async function xoaHocPhanAction(chuongTrinhId: string, id: string, lyDo?: string | null): Promise<string | undefined> {
  const phien = await requirePermission("CT-02");
  try {
    await xoaHocPhan(id, lyDo, nguoiTuPhien(phien));
  } catch (error) {
    return thongBaoLoi(error);
  }
  revalidatePath(duongDan(chuongTrinhId));
  return undefined;
}

export async function diChuyenHocPhanAction(
  chuongTrinhId: string,
  hocPhanId: string,
  huong: "len" | "xuong",
): Promise<string | undefined> {
  await requirePermission("CT-02");

  const dsHienTai = await danhSachHocPhan(chuongTrinhId);
  const viTri = dsHienTai.findIndex((hp) => hp.id === hocPhanId);
  const viTriMoi = huong === "len" ? viTri - 1 : viTri + 1;
  if (viTri === -1 || viTriMoi < 0 || viTriMoi >= dsHienTai.length) return;

  const ds = [...dsHienTai];
  [ds[viTri], ds[viTriMoi]] = [ds[viTriMoi], ds[viTri]];

  try {
    await sapXepHocPhan(chuongTrinhId, ds.map((hp) => hp.id));
  } catch (error) {
    return thongBaoLoi(error);
  }
  revalidatePath(duongDan(chuongTrinhId));
  return undefined;
}

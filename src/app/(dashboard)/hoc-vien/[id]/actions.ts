"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ChuaDangNhapError, requirePermission } from "@/lib/auth/guard";
import {
  capNhatHoSoHocVien,
  capTaiKhoanHocVien,
  datLaiMatKhauHocVien,
  doiMatKhauCuaToi,
  phamViHoSoHocVien,
  themHocVien,
  xoaHocVien,
} from "@/server/services/hv/hv-08-ho-so-hoc-vien";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

const chu = (formData: FormData, ten: string) => String(formData.get(ten) || "");

/** Chạy thao tác, trả lỗi nghiệp vụ thành thông báo cho form. */
async function chay(fn: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }
  return undefined;
}

export async function capNhatHoSoAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const phien = await requirePermission("HV-08");
  const id = chu(formData, "id");
  const loi = await chay(async () =>
    capNhatHoSoHocVien(
      id,
      {
        hoTen: chu(formData, "hoTen") || undefined,
        ngaySinh: chu(formData, "ngaySinh") || null,
        donViCongTac: chu(formData, "donViCongTac") || null,
        chucDanhHocViId: chu(formData, "chucDanhHocViId") || null,
        soCCCD: chu(formData, "soCCCD") || null,
        soDienThoai: chu(formData, "soDienThoai") || null,
        email: chu(formData, "email") || null,
      },
      await phamViHoSoHocVien(phien.userId),
      nguoiTuPhien(phien),
    ),
  );
  if (loi) return loi;
  revalidatePath(`/hoc-vien/${id}`);
  return undefined;
}

// ---------------- (bổ sung 08/10/2026) cán bộ quản lý học viên ----------------

export async function themHocVienAction(_prevState: string | undefined, formData: FormData): Promise<string | undefined> {
  const phien = await requirePermission("HV-08");
  let moiId = "";
  const loi = await chay(async () => {
    const hv = await themHocVien(
      {
        hoTen: chu(formData, "hoTen"),
        soCCCD: chu(formData, "soCCCD"),
        ngaySinh: chu(formData, "ngaySinh") || null,
        donViCongTac: chu(formData, "donViCongTac") || null,
        chucDanhHocViId: chu(formData, "chucDanhHocViId") || null,
        soDienThoai: chu(formData, "soDienThoai") || null,
        email: chu(formData, "email") || null,
        matKhau: formData.get("capTaiKhoan") ? chu(formData, "matKhau") : null,
      },
      await phamViHoSoHocVien(phien.userId),
      nguoiTuPhien(phien),
    );
    moiId = hv.id;
  });
  if (loi) return loi;
  revalidatePath("/hoc-vien");
  redirect(`/hoc-vien/${moiId}`);
}

export async function xoaHocVienAction(id: string): Promise<string | undefined> {
  const phien = await requirePermission("HV-08");
  const loi = await chay(async () => xoaHocVien(id, await phamViHoSoHocVien(phien.userId), nguoiTuPhien(phien)));
  if (loi) return loi;
  revalidatePath("/hoc-vien");
  redirect("/hoc-vien");
}

export type TrangThaiMatKhau = { loi?: string; ok?: string } | undefined;

const HET_PHIEN = "Phiên đăng nhập đã hết hoặc đã đăng xuất - tải lại trang và đăng nhập để tiếp tục.";

/** Form mật khẩu hay để mở lâu: hết phiên thì báo trong form thay vì lỗi trang. */
async function phienMatKhau(maCN: string) {
  try {
    return await requirePermission(maCN);
  } catch (error) {
    if (error instanceof ChuaDangNhapError) return null;
    throw error;
  }
}

export async function matKhauHocVienAction(_prevState: TrangThaiMatKhau, formData: FormData): Promise<TrangThaiMatKhau> {
  const phien = await phienMatKhau("HV-08");
  if (!phien) return { loi: HET_PHIEN };
  const id = chu(formData, "id");
  const matKhau = chu(formData, "matKhau");
  if (matKhau !== chu(formData, "nhapLai")) return { loi: "Mật khẩu nhập lại không khớp" };
  const capMoi = formData.get("cheDo") === "cap";
  const loi = await chay(async () => {
    const phamVi = await phamViHoSoHocVien(phien.userId);
    if (capMoi) await capTaiKhoanHocVien(id, matKhau, phamVi, nguoiTuPhien(phien));
    else await datLaiMatKhauHocVien(id, matKhau, phamVi, nguoiTuPhien(phien));
  });
  if (loi) return { loi };
  revalidatePath(`/hoc-vien/${id}`);
  return { ok: capMoi ? "Đã cấp tài khoản đăng nhập" : "Đã đặt lại mật khẩu" };
}

/** Học viên tự đổi mật khẩu của mình. */
export async function doiMatKhauAction(_prevState: TrangThaiMatKhau, formData: FormData): Promise<TrangThaiMatKhau> {
  const phien = await phienMatKhau("HV-08");
  if (!phien) return { loi: HET_PHIEN };
  const moi = chu(formData, "matKhauMoi");
  if (moi !== chu(formData, "nhapLai")) return { loi: "Mật khẩu nhập lại không khớp" };
  const loi = await chay(() => doiMatKhauCuaToi(phien.userId, chu(formData, "matKhauCu"), moi));
  return loi ? { loi } : { ok: "Đã đổi mật khẩu" };
}

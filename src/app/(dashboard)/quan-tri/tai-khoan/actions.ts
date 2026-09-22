"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import type { VaiTro } from "@/generated/prisma/client";
import {
  taoTaiKhoan,
  khoaTaiKhoan,
  moKhoaTaiKhoan,
  datLaiMatKhau,
  ganVaiTro,
  xoaTaiKhoan,
  TenDangNhapTrungError,
  MatKhauYeuError,
} from "@/server/services/qt/qt-01-quan-ly-tai-khoan";

const DUONG_DAN = "/quan-tri/tai-khoan";

export async function taoTaiKhoanAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("QT-01");

  const vaiTros = formData.getAll("vaiTros") as VaiTro[];
  try {
    await taoTaiKhoan({
      tenDangNhap: String(formData.get("tenDangNhap")),
      matKhau: String(formData.get("matKhau")),
      hoTen: String(formData.get("hoTen")),
      email: (formData.get("email") as string) || undefined,
      vaiTros,
    });
  } catch (error) {
    if (error instanceof TenDangNhapTrungError || error instanceof MatKhauYeuError) {
      return error.message;
    }
    throw error;
  }

  revalidatePath(DUONG_DAN);
}

export async function khoaTaiKhoanAction(nguoiDungId: string) {
  await requirePermission("QT-01");
  await khoaTaiKhoan(nguoiDungId);
  revalidatePath(DUONG_DAN);
}

export async function moKhoaTaiKhoanAction(nguoiDungId: string) {
  await requirePermission("QT-01");
  await moKhoaTaiKhoan(nguoiDungId);
  revalidatePath(DUONG_DAN);
}

export async function xoaTaiKhoanAction(nguoiDungId: string) {
  await requirePermission("QT-01");
  await xoaTaiKhoan(nguoiDungId);
  revalidatePath(DUONG_DAN);
}

export async function datLaiMatKhauAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("QT-01");
  const nguoiDungId = String(formData.get("nguoiDungId"));
  const matKhauMoi = String(formData.get("matKhauMoi"));

  try {
    await datLaiMatKhau(nguoiDungId, matKhauMoi);
  } catch (error) {
    if (error instanceof MatKhauYeuError) return error.message;
    throw error;
  }

  revalidatePath(DUONG_DAN);
}

export async function ganVaiTroAction(nguoiDungId: string, formData: FormData) {
  await requirePermission("QT-01");
  const vaiTros = formData.getAll("vaiTros") as VaiTro[];
  await ganVaiTro(nguoiDungId, vaiTros);
  revalidatePath(DUONG_DAN);
}

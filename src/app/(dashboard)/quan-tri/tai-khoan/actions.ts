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
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

const DUONG_DAN = "/quan-tri/tai-khoan";

export async function taoTaiKhoanAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("QT-01");

  const vaiTros = formData.getAll("vaiTros") as VaiTro[];
  try {
    await taoTaiKhoan(
      {
        tenDangNhap: String(formData.get("tenDangNhap")),
        matKhau: String(formData.get("matKhau")),
        hoTen: String(formData.get("hoTen")),
        email: (formData.get("email") as string) || undefined,
        vaiTros,
      },
      nguoiTuPhien(phien),
    );
  } catch (error) {
    if (error instanceof TenDangNhapTrungError || error instanceof MatKhauYeuError) {
      return error.message;
    }
    throw error;
  }

  revalidatePath(DUONG_DAN);
}

export async function khoaTaiKhoanAction(nguoiDungId: string) {
  const phien = await requirePermission("QT-01");
  await khoaTaiKhoan(nguoiDungId, nguoiTuPhien(phien));
  revalidatePath(DUONG_DAN);
}

export async function moKhoaTaiKhoanAction(nguoiDungId: string) {
  const phien = await requirePermission("QT-01");
  await moKhoaTaiKhoan(nguoiDungId, nguoiTuPhien(phien));
  revalidatePath(DUONG_DAN);
}

export async function xoaTaiKhoanAction(nguoiDungId: string) {
  const phien = await requirePermission("QT-01");
  await xoaTaiKhoan(nguoiDungId, nguoiTuPhien(phien));
  revalidatePath(DUONG_DAN);
}

export async function datLaiMatKhauAction(_prevState: string | undefined, formData: FormData) {
  const phien = await requirePermission("QT-01");
  const nguoiDungId = String(formData.get("nguoiDungId"));
  const matKhauMoi = String(formData.get("matKhauMoi"));

  try {
    await datLaiMatKhau(nguoiDungId, matKhauMoi, nguoiTuPhien(phien));
  } catch (error) {
    if (error instanceof MatKhauYeuError) return error.message;
    throw error;
  }

  revalidatePath(DUONG_DAN);
}

export async function ganVaiTroAction(nguoiDungId: string, formData: FormData) {
  const phien = await requirePermission("QT-01");
  const vaiTros = formData.getAll("vaiTros") as VaiTro[];
  await ganVaiTro(nguoiDungId, vaiTros, nguoiTuPhien(phien));
  revalidatePath(DUONG_DAN);
}

"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { phanCongGiangVien } from "@/server/services/kh/kh-02-phan-cong-giang-vien";
import { thietLapBuoiHoc, xoaBuoiHoc } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import {
  thietLapHinhThucGiangDay,
  tuDongTaoLinkTrucTuyen,
} from "@/server/services/kh/kh-04-hinh-thuc-giang-day";
import type { HinhThucGiangDay } from "@/generated/prisma/client";

export async function phanCongGiangVienAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("KH-02");
  const khoaId = String(formData.get("khoaId"));

  try {
    await phanCongGiangVien({
      khoaId,
      hocPhanId: String(formData.get("hocPhanId")),
      giangVienId: String(formData.get("giangVienId")),
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}

export async function themBuoiHocAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("KH-03");
  const khoaId = String(formData.get("khoaId"));
  const hocPhanId = String(formData.get("hocPhanId") || "");
  const gioBatDau = String(formData.get("gioBatDau") || "");
  const gioKetThuc = String(formData.get("gioKetThuc") || "");
  const phongHocId = String(formData.get("phongHocId") || "");
  const linkTrucTuyen = String(formData.get("linkTrucTuyen") || "");

  try {
    await thietLapBuoiHoc({
      khoaId,
      hocPhanId: hocPhanId || null,
      ngayHoc: String(formData.get("ngayHoc")),
      gioBatDau: gioBatDau || null,
      gioKetThuc: gioKetThuc || null,
      phongHocId: phongHocId || null,
      linkTrucTuyen: linkTrucTuyen || null,
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}

export async function xoaBuoiHocAction(khoaId: string, buoiHocId: string): Promise<void> {
  await requirePermission("KH-03");
  await xoaBuoiHoc(buoiHocId);
  revalidatePath(`/khoa-hoc/${khoaId}`);
}

export async function thietLapHinhThucAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requirePermission("KH-04");
  const khoaId = String(formData.get("khoaId"));

  try {
    await thietLapHinhThucGiangDay(khoaId, formData.get("hinhThucGiangDay") as HinhThucGiangDay);
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }

  revalidatePath(`/khoa-hoc/${khoaId}`);
  return undefined;
}

export async function tuDongTaoLinkAction(khoaId: string): Promise<void> {
  await requirePermission("KH-04");
  await tuDongTaoLinkTrucTuyen(khoaId);
  revalidatePath(`/khoa-hoc/${khoaId}`);
}

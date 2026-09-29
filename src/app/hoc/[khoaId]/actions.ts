"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import {
  danhDauHoanThanh,
  dsThaoLuan,
  themThaoLuan,
  xoaThaoLuan,
  luuGhiChep,
} from "@/server/services/gd/gd-04-hoc-tap";
import { batDauLamBai, nopBaiTracNghiem } from "@/server/services/gd/gd-04-danh-gia";
import { LoiHocLieu } from "@/server/services/gd/loi-giang-day";

// GD-04 (bổ sung 29/09/2026): thao tác trên màn hình học

async function voiLoi<T>(fn: () => Promise<T>): Promise<{ loi?: string; duLieu?: T }> {
  try {
    return { duLieu: await fn() };
  } catch (error) {
    if (error instanceof LoiHocLieu) return { loi: error.message };
    throw error;
  }
}

export async function danhDauHoanThanhAction(khoaId: string, mucKey: string) {
  const phien = await requirePermission("GD-04");
  const kq = await voiLoi(() => danhDauHoanThanh(phien.userId, khoaId, mucKey));
  if (kq.duLieu) revalidatePath(`/hoc/${khoaId}`);
  return kq;
}

export async function taiThaoLuanAction(khoaId: string, mucKey: string, moiKhoa: boolean) {
  const phien = await requirePermission("GD-04");
  return voiLoi(async () =>
    (await dsThaoLuan(phien.userId, khoaId, mucKey, moiKhoa)).map((t) => ({
      id: t.id,
      hoTen: t.hoTen,
      vaiTro: t.vaiTro,
      noiDung: t.noiDung,
      thoiGian: t.createdAt.toISOString(),
      cuaToi: t.cuaToi,
      khoaKhac: t.khoaKhac,
    })),
  );
}

export async function themThaoLuanAction(khoaId: string, mucKey: string, noiDung: string) {
  const phien = await requirePermission("GD-04");
  return voiLoi(async () => {
    await themThaoLuan(phien.userId, khoaId, mucKey, noiDung);
    return true;
  });
}

export async function xoaThaoLuanAction(id: string) {
  const phien = await requirePermission("GD-04");
  return voiLoi(async () => {
    await xoaThaoLuan(phien.userId, id);
    return true;
  });
}

export async function luuGhiChepAction(khoaId: string, mucKey: string, noiDung: string) {
  const phien = await requirePermission("GD-04");
  return voiLoi(async () => {
    await luuGhiChep(phien.userId, khoaId, mucKey, noiDung);
    return new Date().toISOString();
  });
}

export async function batDauLamBaiAction(khoaId: string, baiId: string) {
  const phien = await requirePermission("GD-04");
  return voiLoi(async () => {
    const lan = await batDauLamBai(phien.userId, khoaId, baiId);
    return { ...lan, hetHanLuc: lan.hetHanLuc?.toISOString() ?? null };
  });
}

export async function nopBaiAction(khoaId: string, lanLamId: string, traLoi: Record<string, number[]>) {
  const phien = await requirePermission("GD-04");
  const kq = await voiLoi(() => nopBaiTracNghiem(phien.userId, lanLamId, traLoi));
  if (kq.duLieu) revalidatePath(`/hoc/${khoaId}`);
  return kq;
}

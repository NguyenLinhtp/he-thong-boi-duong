"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import type { NhomBaoCao } from "@/generated/prisma/client";
import {
  taoMauBieu,
  capNhatMauBieu,
  ngungApDungMauBieu,
  taoMauMacDinh,
  type MauBieuInput,
} from "@/server/services/bc/bc-04-mau-bieu";
import { LoiBaoCao } from "@/server/services/bc/loi-bao-cao";

export type KetQuaMauBieu = { loi?: string; thongBao?: string } | undefined;

const DUONG_DAN = "/bao-cao/mau-bieu";

async function thucHien(thaoTac: (nguoi: { nguoiThucHienId: string; nguoiThucHienTen: string }) => Promise<string>): Promise<KetQuaMauBieu> {
  const phien = await requirePermission("BC-04");
  let thongBao: string;
  try {
    thongBao = await thaoTac({ nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen });
  } catch (error) {
    if (error instanceof LoiBaoCao) return { loi: error.message };
    throw error;
  }
  revalidatePath(DUONG_DAN);
  return { thongBao };
}

/** Cột = các chỉ tiêu được tích, theo thứ tự nhập; tiêu đề cột tùy chỉnh (trống = tên chỉ tiêu). */
function docMau(formData: FormData): Omit<MauBieuInput, "ma"> {
  const dsChon = formData.getAll("chiTieu").map(String);
  const cot = dsChon
    .map((chiTieu) => ({
      chiTieu,
      tieuDe: String(formData.get(`tieuDe_${chiTieu}`) ?? ""),
      thuTu: Number(formData.get(`thuTu_${chiTieu}`) || 0),
    }))
    .sort((a, b) => a.thuTu - b.thuTu)
    .map(({ chiTieu, tieuDe }) => ({ chiTieu, tieuDe }));
  return {
    ten: String(formData.get("ten") ?? ""),
    coQuanNhan: String(formData.get("coQuanNhan") ?? ""),
    canCu: String(formData.get("canCu") ?? ""),
    nhomTheo: String(formData.get("nhomTheo") ?? "") as NhomBaoCao,
    cot,
  };
}

export async function luuMauBieuAction(_prev: KetQuaMauBieu, formData: FormData): Promise<KetQuaMauBieu> {
  const maCu = String(formData.get("maCu") ?? "");
  return thucHien(async (nguoi) => {
    if (maCu) {
      const mau = await capNhatMauBieu(maCu, docMau(formData), nguoi);
      return `Đã lưu ${mau.ma} phiên bản ${mau.phienBan} (phiên bản trước được giữ lại).`;
    }
    const mau = await taoMauBieu({ ...docMau(formData), ma: String(formData.get("ma") ?? "") }, nguoi);
    return `Đã tạo mẫu ${mau.ma}.`;
  });
}

export async function ngungMauBieuAction(_prev: KetQuaMauBieu, formData: FormData): Promise<KetQuaMauBieu> {
  const ma = String(formData.get("ma") ?? "");
  return thucHien(async (nguoi) => {
    await ngungApDungMauBieu(ma, nguoi);
    return `Đã ngừng áp dụng ${ma}.`;
  });
}

export async function taoMauMacDinhAction(): Promise<KetQuaMauBieu> {
  return thucHien(async (nguoi) => {
    const ds = await taoMauMacDinh(nguoi);
    return ds.length ? `Đã tạo ${ds.map((m) => m.ma).join(", ")}.` : "Các mẫu gợi ý đã có sẵn.";
  });
}

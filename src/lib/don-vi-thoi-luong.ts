import type { DonViThoiLuong } from "@/generated/prisma/client";

// (bổ sung 19/10/2026 - CT-01) chương trình tính thời lượng theo tiết, tín chỉ hoặc buổi;
// thời lượng học phần (cột soTiet) tính theo cùng đơn vị của chương trình.
export const DON_VI_THOI_LUONG: Record<DonViThoiLuong, string> = {
  TIET: "tiết",
  TIN_CHI: "tín chỉ",
  BUOI: "buổi",
};

export const DS_DON_VI_THOI_LUONG = Object.keys(DON_VI_THOI_LUONG) as DonViThoiLuong[];

export function tenDonViThoiLuong(dv: DonViThoiLuong | null | undefined): string {
  return DON_VI_THOI_LUONG[dv ?? "TIET"];
}

export function dinhDangThoiLuong(soLuong: number | null | undefined, dv: DonViThoiLuong | null | undefined): string {
  return soLuong == null ? "—" : `${soLuong} ${tenDonViThoiLuong(dv)}`;
}

export function docDonViThoiLuong(giaTri: FormDataEntryValue | null): DonViThoiLuong {
  const s = String(giaTri ?? "");
  return (DS_DON_VI_THOI_LUONG as string[]).includes(s) ? (s as DonViThoiLuong) : "TIET";
}

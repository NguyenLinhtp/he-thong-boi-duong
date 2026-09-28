/** 1500000 -> "1.500.000 đ" (nhận number | string | Decimal của Prisma) */
export function dinhDangTien(soTien: number | string | { toString(): string } | null | undefined, rong = "—"): string {
  if (soTien == null || soTien === "") return rong;
  const so = Number(soTien.toString());
  return Number.isFinite(so) ? `${so.toLocaleString("vi-VN")} đ` : rong;
}

export function dinhDangNgay(ngay: Date | string | null | undefined, rong = "—"): string {
  return ngay ? new Date(ngay).toLocaleDateString("vi-VN") : rong;
}

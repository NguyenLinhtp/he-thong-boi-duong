"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type ThanhPhanHien = { id: string; ten: string; batBuoc: boolean; mucSinhVien: number; mucTuDo: number | null };

const tien = (n: number) => `${n.toLocaleString("vi-VN")} đ`;
export const mucTheoDoiTuong = (t: Pick<ThanhPhanHien, "mucSinhVien" | "mucTuDo">, laTuDo: boolean) =>
  laTuDo && t.mucTuDo !== null ? t.mucTuDo : t.mucSinhVien;

/**
 * (bổ sung 06/10/2026 - HV-05) Chọn thành phần lệ phí trên form đăng ký dự thi: thành phần
 * bắt buộc luôn chọn (khóa), tick thêm thành phần tùy chọn; tổng tiền cộng theo mục đã chọn
 * và đối tượng (sinh viên / thí sinh tự do). Gửi id phần tùy chọn trong trường `thanhPhan`.
 */
export function ChonThanhPhanLePhi({
  ds,
  laTuDo,
  daChon,
  khoaChon = [],
  className,
}: {
  ds: ThanhPhanHien[];
  laTuDo: boolean;
  // lựa chọn ban đầu (đơn đã đăng ký)
  daChon?: string[];
  // phần đã xác nhận lệ phí - không bỏ được
  khoaChon?: string[];
  className?: string;
}) {
  const [chon, setChon] = useState<Set<string>>(() => new Set(daChon ?? []));
  const coChon = (t: ThanhPhanHien) => t.batBuoc || chon.has(t.id);
  const tong = ds.filter(coChon).reduce((s, t) => s + mucTheoDoiTuong(t, laTuDo), 0);

  return (
    <fieldset className={cn("flex flex-col gap-2 rounded-lg border bg-card p-3", className)}>
      <legend className="px-1 text-sm font-medium">
        Đăng ký <span className="text-destructive">*</span>
      </legend>
      {ds.map((t) => {
        const khoa = t.batBuoc || khoaChon.includes(t.id);
        return (
          <label
            key={t.id}
            className={cn(
              "flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
              coChon(t) ? "border-primary/50 bg-primary/5" : "hover:bg-muted",
              khoa ? "cursor-default" : "cursor-pointer",
            )}
          >
            <input
              type="checkbox"
              checked={coChon(t)}
              disabled={khoa}
              onChange={(e) =>
                setChon((cu) => {
                  const moi = new Set(cu);
                  if (e.target.checked) moi.add(t.id);
                  else moi.delete(t.id);
                  return moi;
                })
              }
              className="size-4"
            />
            {/* ô bị khóa không gửi giá trị - phần đã xác nhận vẫn được giữ */}
            {!t.batBuoc && khoa && <input type="hidden" name="thanhPhan" value={t.id} />}
            {!t.batBuoc && !khoa && chon.has(t.id) && <input type="hidden" name="thanhPhan" value={t.id} />}
            <span className="flex-1">
              <span className="font-medium">{t.ten}</span>
              {t.batBuoc ? (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="size-3" /> bắt buộc
                </span>
              ) : (
                khoaChon.includes(t.id) && <span className="ml-2 text-xs text-success">đã xác nhận lệ phí</span>
              )}
            </span>
            <span className="font-semibold tabular-nums">{tien(mucTheoDoiTuong(t, laTuDo))}</span>
          </label>
        );
      })}
      <div className="flex items-center justify-between border-t pt-2 text-sm">
        <span className="text-muted-foreground">Tổng lệ phí{laTuDo ? " (thí sinh tự do)" : ""}</span>
        <span className="text-base font-bold text-ued-blue-dam tabular-nums">{tien(tong)}</span>
      </div>
    </fieldset>
  );
}

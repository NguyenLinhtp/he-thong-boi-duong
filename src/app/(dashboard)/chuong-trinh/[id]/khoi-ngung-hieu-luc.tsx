"use client";

import { useActionState } from "react";
import { ngungHieuLucAction } from "./ct06-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ChuongTrinhNgungHieuLuc = {
  id: string;
  trangThai: string;
  lyDoNgungHieuLuc: string | null;
  ngayNgungHieuLuc: Date | null;
};

export function KhoiNgungHieuLuc({ chuongTrinh }: { chuongTrinh: ChuongTrinhNgungHieuLuc }) {
  const [loi, formAction, dangXuLy] = useActionState(ngungHieuLucAction, undefined);

  if (chuongTrinh.trangThai === "NGUNG_HIEU_LUC") {
    return (
      <section className="flex flex-col gap-1 rounded-lg border bg-card p-4 shadow-sm text-sm">
        <h2 className="text-base font-bold text-ued-blue-dam">CT-06 · Đã lưu trữ (ngừng hiệu lực)</h2>
        <p>Lý do: {chuongTrinh.lyDoNgungHieuLuc ?? "—"}</p>
        <p>
          Ngày ngừng hiệu lực:{" "}
          {chuongTrinh.ngayNgungHieuLuc
            ? new Date(chuongTrinh.ngayNgungHieuLuc).toLocaleDateString("vi-VN")
            : "—"}
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="text-base font-bold text-ued-blue-dam">CT-06 · Ngừng hiệu lực/lưu trữ chương trình</h2>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (
            !confirm(
              "Chuyển chương trình sang Ngừng hiệu lực (lưu trữ)? Sẽ không thể dùng để mở khóa mới.",
            )
          ) {
            e.preventDefault();
          }
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="id" value={chuongTrinh.id} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lyDo">Lý do ngừng hiệu lực</Label>
          <Input id="lyDo" name="lyDo" required className="w-72" />
        </div>
        <Button type="submit" variant="destructive" disabled={dangXuLy}>
          {dangXuLy ? "Đang xử lý..." : "Ngừng hiệu lực/lưu trữ"}
        </Button>
        {loi && <p className="text-sm text-destructive">{loi}</p>}
      </form>
    </section>
  );
}

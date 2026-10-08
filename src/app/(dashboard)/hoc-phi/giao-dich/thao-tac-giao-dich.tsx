"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { danhDauDaXuLyAction, ganGiaoDichAction, giaoDichThuNghiemAction } from "./actions";

/** Gán vào hồ sơ / đánh dấu đã xử lý cho 1 giao dịch chờ xử lý. */
export function ThaoTacGiaoDich({ id, choGan, maKhoaGoiY }: { id: string; choGan: boolean; maKhoaGoiY: string }) {
  const [mo, setMo] = useState<"gan" | "xong" | null>(null);
  const [loi, setLoi] = useState<string>();
  const [dangChay, batDau] = useTransition();
  const chay = (fn: () => Promise<string | undefined>) =>
    batDau(async () => {
      const l = await fn();
      setLoi(l);
      if (!l) setMo(null);
    });

  if (mo === "gan") {
    return (
      <form
        className="flex flex-wrap items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const maKhoa = String(f.get("maKhoa"));
          const ma = String(f.get("ma"));
          if (!confirm(`Ghi nhận giao dịch này cho "${ma}" (khóa ${maKhoa}) và lập biên lai?`)) return;
          chay(() => ganGiaoDichAction(id, maKhoa, ma));
        }}
      >
        <Input name="maKhoa" required defaultValue={maKhoaGoiY} placeholder="Mã khóa" className="h-8 w-28" aria-label="Mã khóa" />
        <Input name="ma" required placeholder="Mã SV / mã HV / CCCD" className="h-8 w-44" aria-label="Mã sinh viên, mã học viên hoặc CCCD" />
        <Button size="sm" type="submit" disabled={dangChay}>
          Ghi nhận
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => setMo(null)}>
          Hủy
        </Button>
        {loi && <span className="w-full text-xs text-destructive">{loi}</span>}
      </form>
    );
  }
  if (mo === "xong") {
    return (
      <form
        className="flex flex-wrap items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          const ghiChu = String(new FormData(e.currentTarget).get("ghiChu"));
          chay(() => danhDauDaXuLyAction(id, ghiChu));
        }}
      >
        <Input name="ghiChu" required placeholder="Cách xử lý (vd. đã hoàn tiền thừa)" className="h-8 w-64" aria-label="Ghi chú xử lý" />
        <Button size="sm" type="submit" disabled={dangChay}>
          Lưu
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => setMo(null)}>
          Hủy
        </Button>
        {loi && <span className="w-full text-xs text-destructive">{loi}</span>}
      </form>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {choGan && (
        <Button size="sm" variant="outline" onClick={() => setMo("gan")}>
          Gán vào hồ sơ
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={() => setMo("xong")}>
        Đã xử lý
      </Button>
    </div>
  );
}

/** Tạo giao dịch thử (chỉ khi bật tham số TT_CHO_PHEP_THU_NGHIEM = 1). */
export function FormGiaoDichThuNghiem() {
  const [loi, action, dangXuLy] = useActionState(giaoDichThuNghiemAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        Số tiền
        <Input name="soTien" required inputMode="numeric" placeholder="1100000" className="h-8 w-36" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Nội dung chuyển khoản
        <Input name="noiDung" required placeholder="KH2026006 HV20260001" className="h-8 w-72" />
      </label>
      <Button size="sm" type="submit" disabled={dangXuLy}>
        Gửi giao dịch thử
      </Button>
      {loi && <span className="w-full text-sm text-destructive">{loi}</span>}
    </form>
  );
}

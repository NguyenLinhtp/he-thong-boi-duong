"use client";

import { useActionState } from "react";
import { xetDuyetDanhSachChinhThucAction } from "./actions";
import { Button } from "@/components/ui/button";

export function FormXetDuyet({
  khoaId,
  dsHopLe,
}: {
  khoaId: string;
  dsHopLe: { id: string; hoTen: string; soCCCD: string | null; chuaXacNhanLePhi?: boolean }[];
}) {
  const [loi, formAction, dangXuLy] = useActionState(xetDuyetDanhSachChinhThucAction, undefined);

  if (dsHopLe.length === 0) {
    return (
      <p className="rounded-lg border bg-card p-4 shadow-sm text-sm text-muted-foreground">
        Chưa có hồ sơ nào ở trạng thái Hợp lệ (HV-06) để xét duyệt.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
      <input type="hidden" name="khoaId" value={khoaId} />
      {dsHopLe.map((hv) => (
        <label key={hv.id} className="flex items-center gap-2 text-sm">
          {/* (bổ sung 06/10/2026) khóa dự thi: chưa xác nhận lệ phí thì không chọn duyệt được */}
          <input type="checkbox" name="dangKyId" value={hv.id} defaultChecked={!hv.chuaXacNhanLePhi} disabled={hv.chuaXacNhanLePhi} />
          <span className={hv.chuaXacNhanLePhi ? "text-muted-foreground" : undefined}>
            {hv.hoTen} {hv.soCCCD ? `(${hv.soCCCD})` : ""}
          </span>
          {hv.chuaXacNhanLePhi && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800 ring-1 ring-amber-600/30">Chưa xác nhận lệ phí</span>
          )}
        </label>
      ))}
      <Button type="submit" disabled={dangXuLy} className="mt-2 self-start">
        {dangXuLy ? "Đang duyệt..." : "Xét duyệt chính thức các hồ sơ đã chọn"}
      </Button>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { xetDuyetDanhSachChinhThucAction } from "./actions";
import { Button } from "@/components/ui/button";

export function FormXetDuyet({
  khoaId,
  dsHopLe,
}: {
  khoaId: string;
  dsHopLe: { id: string; hoTen: string; soCCCD: string | null }[];
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
          <input type="checkbox" name="dangKyId" value={hv.id} defaultChecked />
          {hv.hoTen} {hv.soCCCD ? `(${hv.soCCCD})` : ""}
        </label>
      ))}
      <Button type="submit" disabled={dangXuLy} className="mt-2 self-start">
        {dangXuLy ? "Đang duyệt..." : "Xét duyệt chính thức các hồ sơ đã chọn"}
      </Button>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
    </form>
  );
}

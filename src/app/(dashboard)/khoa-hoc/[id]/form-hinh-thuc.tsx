"use client";

import { useActionState } from "react";
import { thietLapHinhThucAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function FormHinhThuc({
  khoaId,
  hinhThucHienTai,
}: {
  khoaId: string;
  hinhThucHienTai: string;
}) {
  const [loi, formAction, dangXuLy] = useActionState(thietLapHinhThucAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <input type="hidden" name="khoaId" value={khoaId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hinhThucGiangDay">Hình thức giảng dạy</Label>
        <select
          id="hinhThucGiangDay"
          name="hinhThucGiangDay"
          defaultValue={hinhThucHienTai}
          className="h-8 rounded-lg border px-2 text-sm"
        >
          <option value="TRUC_TIEP">Trực tiếp</option>
          <option value="TRUC_TUYEN">Trực tuyến</option>
        </select>
      </div>
      <Button type="submit" disabled={dangXuLy}>
        {dangXuLy ? "Đang lưu..." : "Lưu hình thức"}
      </Button>
      {loi && <p className="w-full text-sm text-destructive">{loi}</p>}
    </form>
  );
}

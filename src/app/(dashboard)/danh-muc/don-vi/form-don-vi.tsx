"use client";

import { useActionState } from "react";
import { taoDonViAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormDonVi({
  dsDonVi,
}: {
  dsDonVi: { id: string; ten: string }[];
}) {
  const [loi, formAction, dangXuLy] = useActionState(taoDonViAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ma">Mã đơn vị</Label>
        <Input id="ma" name="ma" required className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ten">Tên đơn vị</Label>
        <Input id="ten" name="ten" required className="w-64" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="donViChaId">Đơn vị cấp trên</Label>
        <select id="donViChaId" name="donViChaId" className="h-8 rounded-lg border px-2 text-sm">
          <option value="">-- Không có --</option>
          {dsDonVi.map((dv) => (
            <option key={dv.id} value={dv.id}>
              {dv.ten}
            </option>
          ))}
        </select>
      </div>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
      <Button type="submit" disabled={dangXuLy}>
        {dangXuLy ? "Đang thêm..." : "Thêm đơn vị"}
      </Button>
    </form>
  );
}

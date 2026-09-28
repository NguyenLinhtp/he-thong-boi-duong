"use client";

import { useActionState } from "react";
import { taoDotTuyenSinhAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormDotTuyenSinh() {
  const [loi, formAction, dangXuLy] = useActionState(taoDotTuyenSinhAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ma">Mã đợt</Label>
        <Input id="ma" name="ma" required className="w-32" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ten">Tên đợt</Label>
        <Input id="ten" name="ten" required className="w-48" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ngayBatDau">Bắt đầu</Label>
        <Input id="ngayBatDau" name="ngayBatDau" type="date" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ngayKetThuc">Kết thúc</Label>
        <Input id="ngayKetThuc" name="ngayKetThuc" type="date" required />
      </div>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
      <Button type="submit" disabled={dangXuLy}>
        {dangXuLy ? "Đang thêm..." : "Thêm"}
      </Button>
    </form>
  );
}

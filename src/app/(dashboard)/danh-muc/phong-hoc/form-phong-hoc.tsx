"use client";

import { useActionState } from "react";
import { taoPhongHocAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormPhongHoc() {
  const [loi, formAction, dangXuLy] = useActionState(taoPhongHocAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ma">Mã phòng</Label>
        <Input id="ma" name="ma" required className="w-32" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ten">Tên phòng</Label>
        <Input id="ten" name="ten" required className="w-48" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="coSo">Cơ sở</Label>
        <Input id="coSo" name="coSo" className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sucChua">Sức chứa</Label>
        <Input id="sucChua" name="sucChua" type="number" min={0} className="w-24" />
      </div>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
      <Button type="submit" disabled={dangXuLy}>
        {dangXuLy ? "Đang thêm..." : "Thêm"}
      </Button>
    </form>
  );
}

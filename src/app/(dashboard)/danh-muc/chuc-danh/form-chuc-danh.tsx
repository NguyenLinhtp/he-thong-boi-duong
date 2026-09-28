"use client";

import { useActionState } from "react";
import { taoChucDanhAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormChucDanh() {
  const [loi, formAction, dangXuLy] = useActionState(taoChucDanhAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ma">Mã</Label>
        <Input id="ma" name="ma" required className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ten">Tên</Label>
        <Input id="ten" name="ten" required className="w-64" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="loai">Phân loại</Label>
        <select id="loai" name="loai" required className="h-8 rounded-lg border px-2 text-sm">
          <option value="chuc_danh">Chức danh nghề nghiệp</option>
          <option value="hoc_ham">Học hàm</option>
          <option value="hoc_vi">Học vị</option>
        </select>
      </div>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
      <Button type="submit" disabled={dangXuLy}>
        {dangXuLy ? "Đang thêm..." : "Thêm"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { taoDonViLienKetAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormTaoDonVi() {
  const [loi, formAction, dangXuLy] = useActionState(taoDonViLienKetAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ma">Mã đơn vị</Label>
        <Input id="ma" name="ma" required className="w-32" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ten">Tên đơn vị</Label>
        <Input id="ten" name="ten" required className="w-56" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="diaChi">Địa chỉ</Label>
        <Input id="diaChi" name="diaChi" className="w-56" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nguoiDaiDien">Người đại diện</Label>
        <Input id="nguoiDaiDien" name="nguoiDaiDien" className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="soDienThoai">Điện thoại</Label>
        <Input id="soDienThoai" name="soDienThoai" className="w-32" />
      </div>
      <Button type="submit" disabled={dangXuLy}>
        {dangXuLy ? "Đang thêm..." : "Thêm đơn vị"}
      </Button>
      {loi && <p className="w-full text-sm text-destructive">{loi}</p>}
    </form>
  );
}

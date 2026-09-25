"use client";

import { useActionState } from "react";
import { capNhatThamSoAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormThamSo() {
  const [loi, formAction, dangLuu] = useActionState(capNhatThamSoAction, undefined);

  return (
    <form action={formAction} className="grid grid-cols-4 items-end gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ma">Mã tham số</Label>
        <Input id="ma" name="ma" placeholder="SO_NGAY_HAN_NOP_GIAY" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="giaTri">Giá trị</Label>
        <Input id="giaTri" name="giaTri" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="moTa">Mô tả</Label>
        <Input id="moTa" name="moTa" />
      </div>
      <Button type="submit" disabled={dangLuu}>
        {dangLuu ? "Đang lưu..." : "Thêm/cập nhật"}
      </Button>
      {loi && <p className="col-span-4 text-sm text-destructive">{loi}</p>}
    </form>
  );
}

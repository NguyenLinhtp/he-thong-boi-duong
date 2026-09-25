"use client";

import { useActionState } from "react";
import { ghiNhatKyAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function FormNhatKy({
  buoiHocId,
  noiDungDaGiang,
  nhanXet,
}: {
  buoiHocId: string;
  noiDungDaGiang: string | null;
  nhanXet: string | null;
}) {
  const [loi, formAction, dangXuLy] = useActionState(ghiNhatKyAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border p-4">
      <input type="hidden" name="buoiHocId" value={buoiHocId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="noiDungDaGiang">Nội dung đã giảng</Label>
        <textarea
          id="noiDungDaGiang"
          name="noiDungDaGiang"
          defaultValue={noiDungDaGiang ?? ""}
          className="min-h-20 rounded-lg border px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nhanXet">Nhận xét tiến độ lớp học</Label>
        <textarea
          id="nhanXet"
          name="nhanXet"
          defaultValue={nhanXet ?? ""}
          className="min-h-20 rounded-lg border px-3 py-2 text-sm"
        />
      </div>
      <Button type="submit" disabled={dangXuLy} className="self-start">
        {dangXuLy ? "Đang lưu..." : "Lưu nhật ký"}
      </Button>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
    </form>
  );
}

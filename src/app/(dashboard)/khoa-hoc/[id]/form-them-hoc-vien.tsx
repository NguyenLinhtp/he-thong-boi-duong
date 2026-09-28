"use client";

import { useActionState } from "react";
import { themHocVienVaoKhoaAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormThemHocVien({ khoaId }: { khoaId: string }) {
  const [loi, formAction, dangXuLy] = useActionState(themHocVienVaoKhoaAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <input type="hidden" name="khoaId" value={khoaId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hoTen">Họ tên</Label>
        <Input id="hoTen" name="hoTen" required className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="soCCCD">Số CCCD</Label>
        <Input id="soCCCD" name="soCCCD" required className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lyDo">Lý do</Label>
        <Input id="lyDo" name="lyDo" placeholder="VD: bổ sung theo yêu cầu đơn vị" className="w-56" />
      </div>
      <Button type="submit" disabled={dangXuLy}>
        {dangXuLy ? "Đang thêm..." : "Thêm học viên"}
      </Button>
      {loi && <p className="w-full text-sm text-destructive">{loi}</p>}
    </form>
  );
}

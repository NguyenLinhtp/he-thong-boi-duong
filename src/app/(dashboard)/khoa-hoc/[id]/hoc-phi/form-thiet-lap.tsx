"use client";

import { useActionState, useState } from "react";
import { thietLapHocPhiAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormThietLap({
  khoaId,
  mucHocPhi,
  chinhSachMienGiam,
  daCoDangKy,
}: {
  khoaId: string;
  mucHocPhi: number | null;
  chinhSachMienGiam: string | null;
  daCoDangKy: boolean;
}) {
  const [loi, formAction, dangLuu] = useActionState(thietLapHocPhiAction, undefined);
  const [mucMoi, setMucMoi] = useState(mucHocPhi ?? 0);
  const canLyDo = daCoDangKy && mucHocPhi !== null && mucMoi !== mucHocPhi;

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <input type="hidden" name="khoaId" value={khoaId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mucHocPhi">Mức học phí (đ)</Label>
        <Input
          id="mucHocPhi"
          name="mucHocPhi"
          type="number"
          min={0}
          defaultValue={mucHocPhi ?? undefined}
          onChange={(e) => setMucMoi(Number(e.target.value))}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="chinhSachMienGiam">Chính sách miễn giảm</Label>
        <Input id="chinhSachMienGiam" name="chinhSachMienGiam" defaultValue={chinhSachMienGiam ?? ""} />
      </div>
      {canLyDo && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lyDoDieuChinh">Lý do điều chỉnh (bắt buộc - đã có học viên đăng ký)</Label>
          <Input id="lyDoDieuChinh" name="lyDoDieuChinh" required />
        </div>
      )}
      <Button type="submit" disabled={dangLuu}>
        {dangLuu ? "Đang lưu..." : "Lưu mức học phí"}
      </Button>
      {loi && <p className="w-full text-sm text-destructive">{loi}</p>}
    </form>
  );
}

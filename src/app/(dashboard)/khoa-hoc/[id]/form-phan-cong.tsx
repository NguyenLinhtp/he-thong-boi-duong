"use client";

import { useActionState } from "react";
import { phanCongGiangVienAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function FormPhanCong({
  khoaId,
  dsHocPhan,
  dsGiangVien,
}: {
  khoaId: string;
  dsHocPhan: { id: string; ten: string }[];
  dsGiangVien: { id: string; hoTen: string }[];
}) {
  const [loi, formAction, dangXuLy] = useActionState(phanCongGiangVienAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <input type="hidden" name="khoaId" value={khoaId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hocPhanId">Học phần</Label>
        <select id="hocPhanId" name="hocPhanId" required className="h-8 rounded-lg border px-2 text-sm">
          {dsHocPhan.map((hp) => (
            <option key={hp.id} value={hp.id}>
              {hp.ten}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="giangVienId">Giảng viên</Label>
        <select id="giangVienId" name="giangVienId" required className="h-8 rounded-lg border px-2 text-sm">
          {dsGiangVien.map((gv) => (
            <option key={gv.id} value={gv.id}>
              {gv.hoTen}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={dangXuLy}>
        {dangXuLy ? "Đang gán..." : "Phân công"}
      </Button>
      {loi && <p className="w-full text-sm text-destructive">{loi}</p>}
    </form>
  );
}

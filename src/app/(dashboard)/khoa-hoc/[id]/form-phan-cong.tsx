"use client";

import { useActionState } from "react";
import { phanCongGiangVienAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function FormPhanCong({
  khoaId,
  dsHocPhan,
  dsGiangVien,
  dsLop = [],
}: {
  khoaId: string;
  dsHocPhan: { id: string; ten: string }[];
  dsGiangVien: { id: string; hoTen: string }[];
  dsLop?: { id: string; maLop: string; ten: string }[];
}) {
  const [loi, formAction, dangXuLy] = useActionState(phanCongGiangVienAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <input type="hidden" name="khoaId" value={khoaId} />
      {dsLop.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lopId">Lớp (KH-07)</Label>
          <select id="lopId" name="lopId" className="h-8 rounded-lg border px-2 text-sm">
            <option value="">— Cả khóa —</option>
            {dsLop.map((lop) => (
              <option key={lop.id} value={lop.id}>
                {lop.maLop} · {lop.ten}
              </option>
            ))}
          </select>
        </div>
      )}
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

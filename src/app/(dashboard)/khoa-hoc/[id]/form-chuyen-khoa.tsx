"use client";

import { useActionState } from "react";
import { chuyenHocVienSangKhoaAction } from "./actions";
import { Button } from "@/components/ui/button";

export function FormChuyenKhoa({
  khoaId,
  dangKyId,
  dsKhoaKhac,
}: {
  khoaId: string;
  dangKyId: string;
  dsKhoaKhac: { id: string; maKhoa: string }[];
}) {
  const [loi, formAction, dangXuLy] = useActionState(chuyenHocVienSangKhoaAction, undefined);

  if (dsKhoaKhac.length === 0) return null;

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="khoaId" value={khoaId} />
      <input type="hidden" name="dangKyId" value={dangKyId} />
      <select name="khoaMoiId" className="h-7 rounded-lg border px-1 text-xs">
        {dsKhoaKhac.map((k) => (
          <option key={k.id} value={k.id}>
            {k.maKhoa}
          </option>
        ))}
      </select>
      <Button type="submit" disabled={dangXuLy} variant="secondary" className="h-7 px-2 text-xs">
        Chuyển
      </Button>
      {loi && <p className="text-xs text-destructive">{loi}</p>}
    </form>
  );
}

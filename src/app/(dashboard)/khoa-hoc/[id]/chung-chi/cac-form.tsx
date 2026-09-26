"use client";

import { useActionState } from "react";
import { lapDeNghiAction, type KetQuaThaoTacCC } from "./actions";
import { Button } from "@/components/ui/button";

export function ThongDiep({ ketQua }: { ketQua: KetQuaThaoTacCC }) {
  return (
    <>
      {ketQua?.thongBao && <p className="text-sm text-muted-foreground">{ketQua.thongBao}</p>}
      {ketQua?.loi && <p className="text-sm text-destructive">{ketQua.loi}</p>}
    </>
  );
}

export function NutLapDeNghi({ khoaId, soDuDieuKien }: { khoaId: string; soDuDieuKien: number }) {
  const [ketQua, formAction, dangXuLy] = useActionState(lapDeNghiAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="khoaId" value={khoaId} />
      <Button type="submit" size="sm" disabled={dangXuLy || soDuDieuKien === 0} className="self-start">
        {dangXuLy ? "Đang lập..." : `Lập đề nghị cấp chứng chỉ cho ${soDuDieuKien} học viên`}
      </Button>
      <ThongDiep ketQua={ketQua} />
    </form>
  );
}

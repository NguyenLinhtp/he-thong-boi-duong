"use client";

import { useActionState } from "react";
import { thamDinhHoSoAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FormThamDinh({ khoaId, dangKyId }: { khoaId: string; dangKyId: string }) {
  const [loi, formAction, dangXuLy] = useActionState(thamDinhHoSoAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="khoaId" value={khoaId} />
      <input type="hidden" name="dangKyId" value={dangKyId} />
      <div className="flex items-center gap-1.5">
        <Input name="ghiChu" placeholder="Lý do (nếu có)" className="h-7 w-40 text-xs" />
        <Button
          type="submit"
          name="ketQua"
          value="HOP_LE"
          disabled={dangXuLy}
          variant="secondary"
          className="h-7 px-2 text-xs"
        >
          Hợp lệ
        </Button>
        <Button
          type="submit"
          name="ketQua"
          value="KHONG_HOP_LE"
          disabled={dangXuLy}
          variant="destructive"
          className="h-7 px-2 text-xs"
        >
          Không hợp lệ
        </Button>
      </div>
      {loi && <p className="text-xs text-destructive">{loi}</p>}
    </form>
  );
}

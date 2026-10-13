"use client";

import { useActionState } from "react";
import { thamDinhHoSoAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// (sửa 11/10/2026 - HV-06/HV-07 gộp 1 bước) Duyệt chính thức (chỉ khi học phí/lệ phí đã xác nhận) hoặc Không hợp lệ
export function FormThamDinh({ khoaId, dangKyId, duocDuyet = true }: { khoaId: string; dangKyId: string; duocDuyet?: boolean }) {
  const [loi, formAction, dangXuLy] = useActionState(thamDinhHoSoAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="khoaId" value={khoaId} />
      <input type="hidden" name="dangKyId" value={dangKyId} />
      <div className="flex flex-wrap items-center gap-1.5">
        <Input name="ghiChu" placeholder="Lý do không hợp lệ" className="h-7 w-40 text-xs" />
        <Button
          type="submit"
          name="ketQua"
          value="CHINH_THUC"
          disabled={dangXuLy || !duocDuyet}
          title={duocDuyet ? undefined : "Chờ cán bộ tài chính xác nhận học phí/lệ phí"}
          className="h-7 px-2 text-xs"
        >
          Duyệt chính thức
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

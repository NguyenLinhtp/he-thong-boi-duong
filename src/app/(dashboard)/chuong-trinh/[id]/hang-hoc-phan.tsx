"use client";

import { useActionState, useState, useTransition } from "react";
import { suaHocPhanAction, xoaHocPhanAction, diChuyenHocPhanAction } from "./hoc-phan-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableRow, TableCell } from "@/components/ui/table";

type HocPhan = { id: string; ten: string; soTiet: number; thuTu: number };

export function HangHocPhan({
  chuongTrinhId,
  hocPhan,
  laDauTien,
  laCuoiCung,
  canLyDo = false,
}: {
  chuongTrinhId: string;
  hocPhan: HocPhan;
  laDauTien: boolean;
  laCuoiCung: boolean;
  // (bổ sung 07/10/2026) chương trình đã ban hành: thêm/sửa/xóa phải ghi lý do
  canLyDo?: boolean;
}) {
  const [dangSua, setDangSua] = useState(false);
  const [loi, formAction, dangXuLy] = useActionState(suaHocPhanAction, undefined);
  const [dangChay, batDau] = useTransition();
  const chay = (fn: () => Promise<string | undefined>) =>
    batDau(async () => {
      const loiChay = await fn();
      if (loiChay) alert(loiChay);
    });

  if (dangSua) {
    return (
      <TableRow>
        <TableCell>{hocPhan.thuTu}</TableCell>
        <TableCell colSpan={3}>
          <form action={formAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={hocPhan.id} />
            <input type="hidden" name="chuongTrinhId" value={chuongTrinhId} />
            <Input name="ten" defaultValue={hocPhan.ten} required className="w-72" aria-label="Tên học phần" />
            <Input name="soTiet" type="number" min={1} defaultValue={hocPhan.soTiet} required className="w-24" aria-label="Số tiết" />
            {canLyDo && <Input name="lyDo" required placeholder="Lý do sửa (bắt buộc)" className="w-64" aria-label="Lý do sửa" />}
            <Button size="sm" type="submit" disabled={dangXuLy}>
              Lưu
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setDangSua(false)}>
              Hủy
            </Button>
            {loi && <span className="text-sm text-destructive">{loi}</span>}
          </form>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>{hocPhan.thuTu}</TableCell>
      <TableCell>{hocPhan.ten}</TableCell>
      <TableCell>{hocPhan.soTiet}</TableCell>
      <TableCell className="flex gap-1.5">
        <Button size="sm" variant="outline" disabled={laDauTien || dangChay} onClick={() => chay(() => diChuyenHocPhanAction(chuongTrinhId, hocPhan.id, "len"))}>
          ↑
        </Button>
        <Button size="sm" variant="outline" disabled={laCuoiCung || dangChay} onClick={() => chay(() => diChuyenHocPhanAction(chuongTrinhId, hocPhan.id, "xuong"))}>
          ↓
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDangSua(true)}>
          Sửa
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={dangChay}
          onClick={() => {
            let lyDo: string | null = null;
            if (canLyDo) {
              lyDo = prompt(`Xóa học phần "${hocPhan.ten}"?\nChương trình đã ban hành - nhập lý do xóa:`);
              if (lyDo === null) return;
              if (!lyDo.trim()) return alert("Cần nhập lý do xóa học phần");
            } else if (!confirm(`Xóa "${hocPhan.ten}"?`)) return;
            chay(() => xoaHocPhanAction(chuongTrinhId, hocPhan.id, lyDo));
          }}
        >
          {dangChay ? "..." : "Xóa"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

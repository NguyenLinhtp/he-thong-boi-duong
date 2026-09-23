"use client";

import { useActionState, useState } from "react";
import { suaHocPhanAction, xoaHocPhanAction, diChuyenHocPhanAction } from "./hoc-phan-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableRow, TableCell } from "@/components/ui/table";
import { NutXoa } from "@/components/danh-muc/nut-xoa";

type HocPhan = { id: string; ten: string; soTiet: number; thuTu: number };

export function HangHocPhan({
  chuongTrinhId,
  hocPhan,
  laDauTien,
  laCuoiCung,
}: {
  chuongTrinhId: string;
  hocPhan: HocPhan;
  laDauTien: boolean;
  laCuoiCung: boolean;
}) {
  const [dangSua, setDangSua] = useState(false);
  const [loi, formAction, dangXuLy] = useActionState(suaHocPhanAction, undefined);

  if (dangSua) {
    return (
      <TableRow>
        <TableCell>{hocPhan.thuTu}</TableCell>
        <TableCell colSpan={3}>
          <form action={formAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={hocPhan.id} />
            <input type="hidden" name="chuongTrinhId" value={chuongTrinhId} />
            <Input name="ten" defaultValue={hocPhan.ten} required className="w-56" />
            <Input
              name="soTiet"
              type="number"
              min={1}
              defaultValue={hocPhan.soTiet}
              required
              className="w-24"
            />
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
        <Button
          size="sm"
          variant="outline"
          disabled={laDauTien}
          onClick={() => diChuyenHocPhanAction(chuongTrinhId, hocPhan.id, "len")}
        >
          ↑
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={laCuoiCung}
          onClick={() => diChuyenHocPhanAction(chuongTrinhId, hocPhan.id, "xuong")}
        >
          ↓
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDangSua(true)}>
          Sửa
        </Button>
        <NutXoa ten={hocPhan.ten} onXoa={() => xoaHocPhanAction(chuongTrinhId, hocPhan.id)} />
      </TableCell>
    </TableRow>
  );
}

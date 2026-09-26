"use client";

import { useActionState, useState } from "react";
import {
  taoLopAction,
  capNhatLopAction,
  xoaLopAction,
  chiaLopTuDongAction,
  xepLopAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";

export type LopRutGon = { id: string; maLop: string; ten: string; siSoToiDa: number | null; siSoHienTai: number };

export function FormTaoLop({ khoaId }: { khoaId: string }) {
  const [loi, formAction, dangXuLy] = useActionState(taoLopAction, undefined);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-lg border p-4">
      <input type="hidden" name="khoaId" value={khoaId} />
      <Input name="ten" placeholder="Tên lớp (vd Lớp sáng)" className="w-56" />
      <Input name="siSoToiDa" type="number" min={1} placeholder="Sĩ số tối đa" className="w-32" />
      <Button type="submit" size="sm" disabled={dangXuLy}>
        {dangXuLy ? "Đang tạo..." : "Tạo lớp"}
      </Button>
      {loi && <p className="w-full text-sm text-destructive">{loi}</p>}
    </form>
  );
}

export function NutChiaTuDong({ khoaId, soChuaXep }: { khoaId: string; soChuaXep: number }) {
  const [thongBao, formAction, dangXuLy] = useActionState(chiaLopTuDongAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="khoaId" value={khoaId} />
      <Button type="submit" size="sm" variant="secondary" disabled={dangXuLy || soChuaXep === 0} className="self-start">
        {dangXuLy ? "Đang chia..." : `Chia đều ${soChuaXep} học viên chưa có lớp`}
      </Button>
      {thongBao && <p className="text-sm text-destructive">{thongBao}</p>}
    </form>
  );
}

export function HangLop({ khoaId, lop }: { khoaId: string; lop: LopRutGon }) {
  const [dangSua, setDangSua] = useState(false);
  const [loiSua, suaAction, dangLuu] = useActionState(capNhatLopAction, undefined);
  const [loiXoa, xoaAction] = useActionState(xoaLopAction, undefined);

  return (
    <>
      <TableRow>
        <TableCell className="font-mono">{lop.maLop}</TableCell>
        <TableCell>{lop.ten}</TableCell>
        <TableCell>
          {lop.siSoHienTai}/{lop.siSoToiDa ?? "∞"}
        </TableCell>
        <TableCell className="flex gap-1.5">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDangSua((v) => !v)}>
            Sửa
          </Button>
          <form
            action={xoaAction}
            onSubmit={(e) => {
              if (!confirm(`Xóa lớp ${lop.maLop}?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="khoaId" value={khoaId} />
            <input type="hidden" name="lopId" value={lop.id} />
            <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">
              Xóa
            </Button>
          </form>
        </TableCell>
      </TableRow>
      {(loiSua || loiXoa) && (
        <TableRow>
          <TableCell colSpan={4} className="text-xs text-destructive">
            {loiSua || loiXoa}
          </TableCell>
        </TableRow>
      )}
      {dangSua && (
        <TableRow>
          <TableCell colSpan={4}>
            <form action={suaAction} className="flex flex-wrap items-end gap-2 py-2">
              <input type="hidden" name="khoaId" value={khoaId} />
              <input type="hidden" name="lopId" value={lop.id} />
              <Input name="ten" defaultValue={lop.ten} className="w-56" />
              <Input name="siSoToiDa" type="number" min={1} defaultValue={lop.siSoToiDa ?? ""} className="w-32" />
              <Button type="submit" size="sm" disabled={dangLuu}>
                {dangLuu ? "Đang lưu..." : "Lưu"}
              </Button>
            </form>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export type HocVienLop = { dangKyId: string; hoTen: string; maHocVien: string; lopId: string | null; maLop: string | null };

/** Xếp lớp lần đầu hoặc chuyển lớp - cùng 1 form; chuyển lớp cần lý do + ngày hiệu lực. */
export function HangHocVienLop({ khoaId, hocVien, dsLop }: { khoaId: string; hocVien: HocVienLop; dsLop: LopRutGon[] }) {
  const [loi, formAction, dangXuLy] = useActionState(xepLopAction, undefined);
  const dsLopDich = dsLop.filter((l) => l.id !== hocVien.lopId);
  const laChuyenLop = hocVien.lopId !== null;

  return (
    <>
      <TableRow>
        <TableCell>{hocVien.maHocVien}</TableCell>
        <TableCell>{hocVien.hoTen}</TableCell>
        <TableCell>{hocVien.maLop ?? <span className="text-muted-foreground">Chưa xếp</span>}</TableCell>
        <TableCell>
          {dsLopDich.length > 0 && (
            <form action={formAction} className="flex flex-wrap items-end gap-1.5">
              <input type="hidden" name="khoaId" value={khoaId} />
              <input type="hidden" name="dangKyId" value={hocVien.dangKyId} />
              <select name="lopId" className="h-8 rounded-lg border px-2 text-sm">
                {dsLopDich.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.maLop} ({l.siSoHienTai}/{l.siSoToiDa ?? "∞"})
                  </option>
                ))}
              </select>
              {laChuyenLop && (
                <>
                  <Input name="ngayHieuLuc" type="date" title="Ngày hiệu lực (mặc định hôm nay)" className="w-36" />
                  <Input name="lyDo" placeholder="Lý do chuyển" required className="w-40" />
                </>
              )}
              <Button type="submit" size="sm" variant="secondary" disabled={dangXuLy}>
                {dangXuLy ? "..." : laChuyenLop ? "Chuyển lớp" : "Xếp lớp"}
              </Button>
            </form>
          )}
        </TableCell>
      </TableRow>
      {loi && (
        <TableRow>
          <TableCell colSpan={4} className="text-xs text-destructive">
            {loi}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

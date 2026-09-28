"use client";

import { useActionState } from "react";
import { themHocPhanAction } from "./hoc-phan-actions";
import { HangHocPhan } from "./hang-hoc-phan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableHead, TableRow } from "@/components/ui/table";

type HocPhan = { id: string; ten: string; soTiet: number; thuTu: number };

export function DanhSachHocPhan({
  chuongTrinhId,
  dsHocPhan,
  tongTiet,
  tongThoiLuong,
  choPhepSua,
}: {
  chuongTrinhId: string;
  dsHocPhan: HocPhan[];
  tongTiet: number;
  tongThoiLuong: number | null;
  choPhepSua: boolean;
}) {
  const [loi, formAction, dangXuLy] = useActionState(themHocPhanAction, undefined);
  const khop = tongThoiLuong != null && tongTiet === tongThoiLuong;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold text-ued-blue-dam">CT-02 · Học phần/chuyên đề</h2>
      <p className={`text-sm ${khop ? "text-green-600" : "text-muted-foreground"}`}>
        Tổng số tiết học phần: {tongTiet}
        {tongThoiLuong != null && ` / ${tongThoiLuong} (tổng thời lượng chương trình)`}
        {tongThoiLuong != null && !khop && " — chưa khớp, cần khớp trước khi trình duyệt"}
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thứ tự</TableHead>
            <TableHead>Tên học phần</TableHead>
            <TableHead>Số tiết</TableHead>
            {choPhepSua && <TableHead>Hành động</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsHocPhan.map((hp, idx) =>
            choPhepSua ? (
              <HangHocPhan
                key={hp.id}
                chuongTrinhId={chuongTrinhId}
                hocPhan={hp}
                laDauTien={idx === 0}
                laCuoiCung={idx === dsHocPhan.length - 1}
              />
            ) : (
              <TableRow key={hp.id}>
                <td className="p-2">{hp.thuTu}</td>
                <td className="p-2">{hp.ten}</td>
                <td className="p-2">{hp.soTiet}</td>
              </TableRow>
            ),
          )}
        </TableBody>
      </Table>

      {choPhepSua && (
        <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <input type="hidden" name="chuongTrinhId" value={chuongTrinhId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ten">Tên học phần</Label>
            <Input id="ten" name="ten" required className="w-64" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="soTiet">Số tiết</Label>
            <Input id="soTiet" name="soTiet" type="number" min={1} required className="w-28" />
          </div>
          {loi && <p className="text-sm text-destructive">{loi}</p>}
          <Button type="submit" disabled={dangXuLy}>
            {dangXuLy ? "Đang thêm..." : "Thêm học phần"}
          </Button>
        </form>
      )}
    </section>
  );
}

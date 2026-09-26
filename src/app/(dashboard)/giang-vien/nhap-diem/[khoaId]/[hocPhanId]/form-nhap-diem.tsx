"use client";

import { useActionState } from "react";
import { nhapDiemAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

export type DongDiem = {
  hocVienId: string;
  maHocVien: string;
  hoTen: string;
  diemThanhPhan: number | null;
  diemKetThuc: number | null;
  diemHocPhan: number | null;
  dat: boolean | null;
  daPheDuyet: boolean;
};

export function FormNhapDiem({
  khoaId,
  hocPhanId,
  dsDong,
}: {
  khoaId: string;
  hocPhanId: string;
  dsDong: DongDiem[];
}) {
  const [loi, formAction, dangXuLy] = useActionState(nhapDiemAction, undefined);
  // chỉ gửi các dòng chưa phê duyệt - dòng đã duyệt bị khóa (KQ-04)
  const coDongSuaDuoc = dsDong.some((d) => !d.daPheDuyet);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="khoaId" value={khoaId} />
      <input type="hidden" name="hocPhanId" value={hocPhanId} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã học viên</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>Điểm thành phần</TableHead>
            <TableHead>Điểm kết thúc</TableHead>
            <TableHead>Điểm học phần</TableHead>
            <TableHead>Kết quả</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsDong.map((d) => (
            <TableRow key={d.hocVienId}>
              <TableCell>{d.maHocVien}</TableCell>
              <TableCell>{d.hoTen}</TableCell>
              {d.daPheDuyet ? (
                <>
                  <TableCell>{d.diemThanhPhan ?? "—"}</TableCell>
                  <TableCell>{d.diemKetThuc ?? "—"}</TableCell>
                </>
              ) : (
                <>
                  <TableCell>
                    <input type="hidden" name="hocVienId" value={d.hocVienId} />
                    <Input
                      name={`diemThanhPhan_${d.hocVienId}`}
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      defaultValue={d.diemThanhPhan ?? ""}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      name={`diemKetThuc_${d.hocVienId}`}
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      defaultValue={d.diemKetThuc ?? ""}
                      className="w-24"
                    />
                  </TableCell>
                </>
              )}
              <TableCell>{d.diemHocPhan ?? "—"}</TableCell>
              <TableCell>
                {d.dat === null ? "—" : d.dat ? "Đạt" : "Không đạt"}
                {d.daPheDuyet && <span className="ml-1 text-xs text-muted-foreground">(đã phê duyệt)</span>}
              </TableCell>
            </TableRow>
          ))}
          {dsDong.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                Khóa chưa có học viên chính thức nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <Button type="submit" disabled={dangXuLy || !coDongSuaDuoc} className="self-start">
        {dangXuLy ? "Đang lưu..." : "Lưu bảng điểm"}
      </Button>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
    </form>
  );
}

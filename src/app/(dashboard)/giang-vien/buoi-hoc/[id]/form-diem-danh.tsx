"use client";

import { useActionState } from "react";
import { diemDanhAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

const TUY_CHON_TRANG_THAI = [
  { ma: "CO_MAT", nhan: "Có mặt" },
  { ma: "VANG_CO_PHEP", nhan: "Vắng có phép" },
  { ma: "VANG_KHONG_PHEP", nhan: "Vắng không phép" },
];

export type HocVienDeDiemDanh = {
  hocVienId: string;
  hoTen: string;
  maHocVien: string;
  trangThaiHienTai: string | null;
};

export function FormDiemDanh({
  buoiHocId,
  dsHocVien,
}: {
  buoiHocId: string;
  dsHocVien: HocVienDeDiemDanh[];
}) {
  const [loi, formAction, dangXuLy] = useActionState(diemDanhAction, undefined);

  // key theo giá trị đang lưu: React 19 tự reset form sau action về giá trị lúc mount
  return (
    <form key={JSON.stringify(dsHocVien)} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="buoiHocId" value={buoiHocId} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã học viên</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsHocVien.map((hv) => (
            <TableRow key={hv.hocVienId}>
              <TableCell>{hv.maHocVien}</TableCell>
              <TableCell>{hv.hoTen}</TableCell>
              <TableCell>
                <input type="hidden" name="hocVienId" value={hv.hocVienId} />
                <select
                  name={`trangThai_${hv.hocVienId}`}
                  defaultValue={hv.trangThaiHienTai ?? "VANG_KHONG_PHEP"}
                  className="h-8 rounded-lg border px-2 text-sm"
                >
                  {TUY_CHON_TRANG_THAI.map((tc) => (
                    <option key={tc.ma} value={tc.ma}>
                      {tc.nhan}
                    </option>
                  ))}
                </select>
              </TableCell>
            </TableRow>
          ))}
          {dsHocVien.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                Khóa chưa có học viên chính thức nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <Button type="submit" disabled={dangXuLy || dsHocVien.length === 0} className="self-start">
        {dangXuLy ? "Đang lưu..." : "Lưu điểm danh"}
      </Button>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
    </form>
  );
}

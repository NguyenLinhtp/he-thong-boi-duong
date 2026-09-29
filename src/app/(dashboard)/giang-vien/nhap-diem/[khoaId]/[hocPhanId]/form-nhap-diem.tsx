"use client";

import { useActionState, useRef } from "react";
import { nhapDiemAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

export type DongDiem = {
  hocVienId: string;
  maHocVien: string;
  hoTen: string;
  maLop: string | null;
  diemThanhPhan: number | null;
  diemKetThuc: number | null;
  diemHocPhan: number | null;
  dat: boolean | null;
  daPheDuyet: boolean;
  // điểm đánh giá trực tuyến của học phần (null: học viên không có dữ liệu)
  trucTuyen: { diem: number | null; chuaDu: boolean; chiTiet: string } | null;
};

export function FormNhapDiem({
  khoaId,
  hocPhanId,
  dsDong,
  coTrucTuyen = false,
}: {
  khoaId: string;
  hocPhanId: string;
  dsDong: DongDiem[];
  // học phần có bài trắc nghiệm/sản phẩm được chọn tính điểm
  coTrucTuyen?: boolean;
}) {
  const [loi, formAction, dangXuLy] = useActionState(nhapDiemAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const dongDienDuoc = dsDong.filter((d) => !d.daPheDuyet && d.trucTuyen?.diem != null);

  // điền điểm trực tuyến (làm tròn 0,1 theo bước nhập) vào ô điểm thành phần - giảng viên vẫn phải bấm Lưu
  function dienDiemTrucTuyen() {
    const form = formRef.current;
    if (!form) return;
    for (const d of dongDienDuoc) {
      const o = form.elements.namedItem(`diemThanhPhan_${d.hocVienId}`);
      if (o instanceof HTMLInputElement) o.value = String(Math.round(d.trucTuyen!.diem! * 10) / 10);
    }
  }
  // chỉ gửi các dòng chưa phê duyệt - dòng đã duyệt bị khóa (KQ-04)
  const coDongSuaDuoc = dsDong.some((d) => !d.daPheDuyet);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="khoaId" value={khoaId} />
      <input type="hidden" name="hocPhanId" value={hocPhanId} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã học viên</TableHead>
            <TableHead>Họ tên</TableHead>
            {coTrucTuyen && <TableHead title="Trung bình có hệ số các bài trắc nghiệm/sản phẩm tính điểm">Điểm trực tuyến</TableHead>}
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
              <TableCell>
                {d.hoTen}
                {d.maLop && <span className="ml-1 text-xs text-muted-foreground">({d.maLop})</span>}
              </TableCell>
              {coTrucTuyen && (
                <TableCell title={d.trucTuyen?.chiTiet}>
                  {d.trucTuyen?.chuaDu ? (
                    <span className="text-xs text-warning">Có sản phẩm chưa chấm</span>
                  ) : (
                    (d.trucTuyen?.diem ?? "—")
                  )}
                </TableCell>
              )}
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
              <TableCell colSpan={coTrucTuyen ? 7 : 6} className="text-center text-sm text-muted-foreground">
                Khóa chưa có học viên chính thức nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={dangXuLy || !coDongSuaDuoc}>
          {dangXuLy ? "Đang lưu..." : "Lưu bảng điểm"}
        </Button>
        {coTrucTuyen && (
          <Button type="button" variant="outline" disabled={dongDienDuoc.length === 0} onClick={dienDiemTrucTuyen}>
            Điền điểm trực tuyến vào điểm thành phần
          </Button>
        )}
      </div>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
    </form>
  );
}

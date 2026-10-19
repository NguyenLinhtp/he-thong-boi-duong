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
  donVi = "tiết",
  choPhepSua,
  canLyDo = false,
  chiDuThi = false,
}: {
  chuongTrinhId: string;
  dsHocPhan: HocPhan[];
  tongTiet: number;
  tongThoiLuong: number | null;
  // (bổ sung 19/10/2026) đơn vị thời lượng của chương trình: tiết/tín chỉ/buổi
  donVi?: string;
  choPhepSua: boolean;
  // (bổ sung 07/10/2026) chương trình đã ban hành: thêm/sửa/xóa học phần phải ghi lý do
  canLyDo?: boolean;
  // (bổ sung 14/10/2026) chương trình chỉ dự thi (PT3): học phần/tổng thời lượng không bắt buộc
  chiDuThi?: boolean;
}) {
  const [loi, formAction, dangXuLy] = useActionState(themHocPhanAction, undefined);
  const khop = tongThoiLuong != null && tongTiet === tongThoiLuong;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold text-ued-blue-dam">CT-02 · Học phần/chuyên đề</h2>
      {chiDuThi ? (
        <p className="text-sm text-muted-foreground">
          Chương trình chỉ đăng ký dự thi (PT3): không bắt buộc học phần và tổng thời lượng.
        </p>
      ) : (
        <p className={`text-sm ${khop ? "text-green-600" : "text-amber-600"}`}>
          Tổng thời lượng học phần: {tongTiet} {donVi}
          {tongThoiLuong != null && ` / ${tongThoiLuong} ${donVi} (tổng thời lượng chương trình)`}
          {!khop && " — chưa khớp tổng thời lượng chương trình (chỉ cảnh báo, vẫn trình duyệt được)"}
        </p>
      )}
      {choPhepSua && canLyDo && (
        <p className="text-sm text-warning">
          Chương trình đã ban hành: thêm/sửa/xóa học phần phải ghi lý do và được ghi nhật ký. Không xóa được học phần đã có buổi học, phân
          công giảng viên, tài liệu, kết quả hoặc bài làm ở khóa nào; không đổi thời lượng học phần đã có kết quả học tập.
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thứ tự</TableHead>
            <TableHead>Tên học phần</TableHead>
            <TableHead>Thời lượng ({donVi})</TableHead>
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
                canLyDo={canLyDo}
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
            <Label htmlFor="soTiet">Thời lượng ({donVi})</Label>
            <Input id="soTiet" name="soTiet" type="number" min={1} required className="w-28" />
          </div>
          {canLyDo && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lyDoThemHp">Lý do thêm</Label>
              <Input id="lyDoThemHp" name="lyDo" required className="w-72" placeholder="Bắt buộc với chương trình đã ban hành" />
            </div>
          )}
          {loi && <p className="text-sm text-destructive">{loi}</p>}
          <Button type="submit" disabled={dangXuLy}>
            {dangXuLy ? "Đang thêm..." : "Thêm học phần"}
          </Button>
        </form>
      )}
    </section>
  );
}

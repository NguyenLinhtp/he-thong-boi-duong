"use client";

import { useActionState } from "react";
import { trinhThamDinhAction, pheDuyetAction, traVeDuThaoAction } from "./phe-duyet-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ChuongTrinhPheDuyet = {
  id: string;
  trangThai: string;
  yKienThamDinh: string | null;
  soQuyetDinh: string | null;
  ngayBanHanh: Date | null;
};

export function KhoiPheDuyet({
  chuongTrinh,
  tongTietKhop,
}: {
  chuongTrinh: ChuongTrinhPheDuyet;
  tongTietKhop: boolean;
}) {
  const [loiTrinh, trinhAction, dangTrinh] = useActionState(trinhThamDinhAction, undefined);
  const [loiDuyet, duyetAction, dangDuyet] = useActionState(pheDuyetAction, undefined);

  if (chuongTrinh.trangThai === "DU_THAO") {
    return (
      <section className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-base font-bold text-ued-blue-dam">CT-03 · Trình thẩm định</h2>
        <form action={trinhAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={chuongTrinh.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="yKienThamDinh">Ý kiến (tùy chọn)</Label>
            <Input id="yKienThamDinh" name="yKienThamDinh" className="w-72" />
          </div>
          <Button type="submit" disabled={dangTrinh || !tongTietKhop}>
            {dangTrinh ? "Đang trình..." : "Trình thẩm định"}
          </Button>
          {!tongTietKhop && (
            <span className="text-sm text-destructive">
              Tổng số tiết học phần chưa khớp tổng thời lượng
            </span>
          )}
          {loiTrinh && <p className="text-sm text-destructive">{loiTrinh}</p>}
        </form>
      </section>
    );
  }

  if (chuongTrinh.trangThai === "CHO_THAM_DINH") {
    return (
      <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-base font-bold text-ued-blue-dam">CT-03 · Chờ thẩm định</h2>
        {chuongTrinh.yKienThamDinh && (
          <p className="text-sm text-muted-foreground">Ý kiến: {chuongTrinh.yKienThamDinh}</p>
        )}
        <form action={duyetAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={chuongTrinh.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="soQuyetDinh">Số quyết định ban hành</Label>
            <Input id="soQuyetDinh" name="soQuyetDinh" required className="w-56" />
          </div>
          <Button type="submit" disabled={dangDuyet}>
            {dangDuyet ? "Đang phê duyệt..." : "Phê duyệt, ban hành"}
          </Button>
          {loiDuyet && <p className="text-sm text-destructive">{loiDuyet}</p>}
        </form>
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onClick={() => traVeDuThaoAction(chuongTrinh.id)}
        >
          Trả về Dự thảo (thẩm định không đạt)
        </Button>
      </section>
    );
  }

  if (chuongTrinh.trangThai === "DA_BAN_HANH") {
    return (
      <section className="flex flex-col gap-1 rounded-lg border bg-card p-4 shadow-sm text-sm">
        <h2 className="text-base font-bold text-ued-blue-dam">CT-03 · Đã ban hành</h2>
        <p>Số quyết định: {chuongTrinh.soQuyetDinh}</p>
        <p>
          Ngày ban hành:{" "}
          {chuongTrinh.ngayBanHanh
            ? new Date(chuongTrinh.ngayBanHanh).toLocaleDateString("vi-VN")
            : "—"}
        </p>
      </section>
    );
  }

  return null;
}

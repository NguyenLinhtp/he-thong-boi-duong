"use client";

import { useActionState, type FormEvent } from "react";
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
  canhBao,
}: {
  chuongTrinh: ChuongTrinhPheDuyet;
  // (sửa 19/10/2026) tổng thời lượng học phần lệch tổng thời lượng chương trình: chỉ cảnh báo, không chặn
  canhBao: string | null;
}) {
  const [loiTrinh, trinhAction, dangTrinh] = useActionState(trinhThamDinhAction, undefined);
  const [loiDuyet, duyetAction, dangDuyet] = useActionState(pheDuyetAction, undefined);
  const xacNhanCanhBao = (e: FormEvent<HTMLFormElement>) => {
    if (canhBao && !confirm(`${canhBao}.\n\nVẫn tiếp tục?`)) e.preventDefault();
  };
  const dongCanhBao = canhBao && <p className="text-sm text-amber-600">Cảnh báo: {canhBao}.</p>;

  if (chuongTrinh.trangThai === "DU_THAO") {
    return (
      <section className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-base font-bold text-ued-blue-dam">CT-03 · Trình thẩm định</h2>
        {dongCanhBao}
        <form action={trinhAction} onSubmit={xacNhanCanhBao} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={chuongTrinh.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="yKienThamDinh">Ý kiến (tùy chọn)</Label>
            <Input id="yKienThamDinh" name="yKienThamDinh" className="w-72" />
          </div>
          <Button type="submit" disabled={dangTrinh}>
            {dangTrinh ? "Đang trình..." : "Trình thẩm định"}
          </Button>
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
        {dongCanhBao}
        <form action={duyetAction} onSubmit={xacNhanCanhBao} className="flex flex-wrap items-end gap-3">
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

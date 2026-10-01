"use client";

import { useActionState, useState } from "react";
import { thietLapHocPhiAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormThietLap({
  khoaId,
  mucHocPhi,
  chinhSachMienGiam,
  daCoDangKy,
  theoDoiTuong = false,
  mucHocPhiTuDo = null,
}: {
  khoaId: string;
  mucHocPhi: number | null;
  // (bổ sung 01/10/2026) khóa dự thi theo mã SV: lệ phí sinh viên ĐHSP-ĐHĐN / thí sinh tự do
  theoDoiTuong?: boolean;
  mucHocPhiTuDo?: number | null;
  chinhSachMienGiam: string | null;
  daCoDangKy: boolean;
}) {
  const [loi, formAction, dangLuu] = useActionState(thietLapHocPhiAction, undefined);
  const [mucMoi, setMucMoi] = useState(mucHocPhi ?? 0);
  const [tuDoMoi, setTuDoMoi] = useState<number | null>(mucHocPhiTuDo);
  const canLyDo = daCoDangKy && mucHocPhi !== null && (mucMoi !== mucHocPhi || (theoDoiTuong && tuDoMoi !== mucHocPhiTuDo));

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <input type="hidden" name="khoaId" value={khoaId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mucHocPhi">{theoDoiTuong ? "Lệ phí sinh viên ĐHSP-ĐHĐN (đ)" : "Mức học phí (đ)"}</Label>
        <Input
          id="mucHocPhi"
          name="mucHocPhi"
          type="number"
          min={0}
          defaultValue={mucHocPhi ?? undefined}
          onChange={(e) => setMucMoi(Number(e.target.value))}
          required
        />
      </div>
      {theoDoiTuong && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mucHocPhiTuDo">Lệ phí thí sinh tự do (đ)</Label>
          <Input
            id="mucHocPhiTuDo"
            name="mucHocPhiTuDo"
            type="number"
            min={0}
            placeholder="Trống = như sinh viên"
            defaultValue={mucHocPhiTuDo ?? undefined}
            onChange={(e) => setTuDoMoi(e.target.value === "" ? null : Number(e.target.value))}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="chinhSachMienGiam">Chính sách miễn giảm</Label>
        <Input id="chinhSachMienGiam" name="chinhSachMienGiam" defaultValue={chinhSachMienGiam ?? ""} />
      </div>
      {canLyDo && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lyDoDieuChinh">Lý do điều chỉnh (bắt buộc - đã có học viên đăng ký)</Label>
          <Input id="lyDoDieuChinh" name="lyDoDieuChinh" required />
        </div>
      )}
      <Button type="submit" disabled={dangLuu}>
        {dangLuu ? "Đang lưu..." : theoDoiTuong ? "Lưu lệ phí" : "Lưu mức học phí"}
      </Button>
      {loi && <p className="w-full text-sm text-destructive">{loi}</p>}
    </form>
  );
}

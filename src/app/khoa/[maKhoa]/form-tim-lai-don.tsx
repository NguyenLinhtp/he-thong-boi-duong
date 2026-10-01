"use client";

import { useActionState } from "react";
import { timLaiDonDuThiAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// (bổ sung 01/10/2026) thí sinh đã đăng ký dự thi mở lại đơn: in lại, chuyển khoản, nộp minh chứng
// theoMaSinhVien: mã SV + 4 số cuối CCCD; ngược lại (form định danh CCCD): số CCCD + họ tên đã khai
export function FormTimLaiDon({
  khoaId,
  maKhoa,
  moSan = false,
  theoMaSinhVien,
}: {
  khoaId: string;
  maKhoa: string;
  moSan?: boolean;
  theoMaSinhVien: boolean;
}) {
  const [loi, formAction, dangXuLy] = useActionState(timLaiDonDuThiAction, undefined);
  return (
    <details open={moSan} className="rounded-lg border bg-muted/30 p-4 text-sm">
      <summary className="cursor-pointer font-medium">Đã đăng ký? Xem lại đơn và nộp minh chứng chuyển khoản</summary>
      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="khoaId" value={khoaId} />
        <input type="hidden" name="maKhoa" value={maKhoa} />
        {theoMaSinhVien ? (
          <>
            <label className="flex flex-col gap-1">
              Mã sinh viên
              <Input name="maSinhVien" required className="w-40 font-mono uppercase" />
            </label>
            <label className="flex flex-col gap-1">
              4 số cuối CCCD
              <Input name="cuoiCCCD" required inputMode="numeric" pattern="\d{4}" maxLength={4} className="w-28 font-mono" />
            </label>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1">
              Số CCCD
              <Input name="soCCCD" required inputMode="numeric" className="w-44 font-mono" />
            </label>
            <label className="flex flex-col gap-1">
              Họ tên
              <Input name="hoTen" required className="w-56" />
            </label>
          </>
        )}
        <Button type="submit" variant="outline" disabled={dangXuLy}>
          {dangXuLy ? "Đang tìm..." : "Mở đơn"}
        </Button>
        {loi && <p className="w-full text-destructive">{loi}</p>}
      </form>
    </details>
  );
}

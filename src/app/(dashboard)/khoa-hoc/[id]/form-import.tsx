"use client";

import { useActionState } from "react";
import { importDanhSachAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function FormImport({ khoaId }: { khoaId: string }) {
  const [trangThai, formAction, dangXuLy] = useActionState(importDanhSachAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border p-4">
      <input type="hidden" name="khoaId" value={khoaId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="file">File CSV danh sách học viên</Label>
        <input id="file" name="file" type="file" accept=".csv,text/csv" required className="text-sm" />
        <p className="text-xs text-muted-foreground">
          Cột theo đúng thứ tự, dòng đầu là tiêu đề: họ tên, CCCD/mã số, đơn vị công tác, số điện
          thoại, email.
        </p>
      </div>
      <Button type="submit" disabled={dangXuLy} className="self-start">
        {dangXuLy ? "Đang import..." : "Import danh sách"}
      </Button>

      {trangThai?.soLuongDaTao != null && (
        <p className="text-sm text-primary">Đã import thành công {trangThai.soLuongDaTao} học viên.</p>
      )}
      {trangThai?.loi && <p className="text-sm text-destructive">{trangThai.loi}</p>}
      {trangThai?.cacDongLoi && trangThai.cacDongLoi.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-destructive">
          {trangThai.cacDongLoi.map((l) => (
            <li key={l.dong}>
              Dòng {l.dong}: {l.loi}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

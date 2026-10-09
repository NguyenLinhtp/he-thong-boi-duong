"use client";

import { useActionState } from "react";
import { Download } from "lucide-react";
import { importDanhSachAction } from "./actions";
import { Button } from "@/components/ui/button";
import { ChonTep } from "@/components/chung/chon-tep";
import { Label } from "@/components/ui/label";

/** (sửa 08/10/2026) nạp danh sách theo tệp mẫu Excel có cột đúng với form đăng ký của khóa. */
export function FormImport({ khoaId, dsCot }: { khoaId: string; dsCot: string[] }) {
  const [trangThai, formAction, dangXuLy] = useActionState(importDanhSachAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <input type="hidden" name="khoaId" value={khoaId} />
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Tệp danh sách học viên được cử đi học (.xlsx hoặc .csv)</Label>
          <a
            href={`/api/hv/khoa/${khoaId}/import/mau`}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
          >
            <Download className="size-3.5" aria-hidden />
            Tải tệp mẫu
          </a>
        </div>
        <ChonTep name="file" accept=".xlsx,.csv,text/csv" required nhan="Chọn tệp Excel/CSV" className="max-w-xl" />
        <p className="text-xs text-muted-foreground">
          Cột theo form đăng ký của khóa (nhận theo tên cột, không cần đúng thứ tự): {dsCot.join(" · ")}. Cột (*) là trường bắt buộc của
          form - để trống thì học viên bổ sung khi xác nhận tham gia; riêng Họ và tên, Số CCCD/hộ chiếu phải có. Có dòng lỗi thì không nạp
          dòng nào.
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

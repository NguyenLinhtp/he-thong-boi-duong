"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ChonTep } from "@/components/chung/chon-tep";
import { importSinhVienAction } from "./actions";

export function FormImportSinhVien() {
  const [kq, formAction, dangXuLy] = useActionState(importSinhVienAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <ChonTep
        name="file"
        accept=".xlsx,.csv"
        required
        nhan="Chọn tệp Excel/CSV"
        goiY="Các cột: Mã sinh viên, Số CCCD, Họ tên sinh viên, Lớp sinh hoạt (dòng tiêu đề bắt buộc, thứ tự cột tùy ý)"
        className="max-w-xl"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={dangXuLy}>
          {dangXuLy ? "Đang nạp..." : "Nạp danh sách"}
        </Button>
        <a href="/api/hv/sinh-vien/mau" className="text-sm underline">
          Tải tệp mẫu
        </a>
      </div>
      {kq?.ok && <p className="text-sm text-success">{kq.ok}</p>}
      {kq?.loi && <p className="text-sm text-destructive">{kq.loi}</p>}
      {kq?.cacDongLoi && kq.cacDongLoi.length > 0 && (
        <ul className="max-h-60 list-disc overflow-auto pl-5 text-sm text-destructive">
          {kq.cacDongLoi.map((l, i) => (
            <li key={i}>
              Dòng {l.dong}: {l.loi}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

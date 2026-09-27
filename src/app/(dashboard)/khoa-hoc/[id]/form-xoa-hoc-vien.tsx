"use client";

import { useActionState } from "react";
import { xoaHocVienKhoiKhoaAction } from "./actions";
import { Button } from "@/components/ui/button";

// HV-09: xóa học viên khỏi khóa - hiện lý do khi bị chặn
export function FormXoaHocVien({ khoaId, dangKyId }: { khoaId: string; dangKyId: string }) {
  const [loi, formAction, dangXuLy] = useActionState(xoaHocVienKhoiKhoaAction.bind(null, khoaId, dangKyId), undefined);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Xóa học viên khỏi khóa? Nếu học viên đã học, hãy dùng Ghi nhận thôi học.")) e.preventDefault();
      }}
      className="flex items-center gap-1.5"
    >
      <Button type="submit" disabled={dangXuLy} variant="ghost" className="h-7 px-2 text-xs text-destructive">
        Xóa
      </Button>
      {loi && <p className="max-w-64 text-xs text-destructive">{loi}</p>}
    </form>
  );
}

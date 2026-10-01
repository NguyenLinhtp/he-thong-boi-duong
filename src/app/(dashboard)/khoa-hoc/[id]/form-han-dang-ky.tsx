"use client";

import { useActionState } from "react";
import { datHanDangKyAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// (bổ sung 01/10/2026) hạn đăng ký: hết ngày này hệ thống tự đóng đăng ký (link công khai, mọi kênh)
export function FormHanDangKy({ khoaId, hanDangKy, daQuaHan }: { khoaId: string; hanDangKy: string | null; daQuaHan: boolean }) {
  const [kq, formAction, dangXuLy] = useActionState(datHanDangKyAction, undefined);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="khoaId" value={khoaId} />
      <Input name="hanDangKy" type="date" defaultValue={hanDangKy ?? ""} aria-label="Hạn đăng ký" className="h-8 w-40" />
      <Button type="submit" size="sm" variant="outline" disabled={dangXuLy}>
        {dangXuLy ? "Đang lưu..." : "Lưu hạn"}
      </Button>
      {daQuaHan && <span className="text-warning">Đã quá hạn - không nhận đăng ký mới</span>}
      {kq === "OK" && <span className="text-success">Đã lưu</span>}
      {kq && kq !== "OK" && <span className="text-destructive">{kq}</span>}
    </form>
  );
}

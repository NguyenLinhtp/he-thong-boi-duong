"use client";

import { useActionState } from "react";
import { datNgayKhoaThiAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// (bổ sung 14/10/2026) khóa dự thi: sửa ngày mở khóa / ngày thi (ngày thi không trước ngày mở khóa, không trước hạn đăng ký)
export function FormNgayKhoaThi({ khoaId, ngayMo, ngayThi }: { khoaId: string; ngayMo: string | null; ngayThi: string | null }) {
  const [kq, formAction, dangXuLy] = useActionState(datNgayKhoaThiAction, undefined);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 text-sm">
      <input type="hidden" name="khoaId" value={khoaId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="ngayMo" className="font-normal text-muted-foreground">Ngày mở khóa</Label>
        <Input id="ngayMo" name="ngayMo" type="date" defaultValue={ngayMo ?? ""} className="h-8 w-40" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="ngayThi" className="font-normal text-muted-foreground">Ngày thi</Label>
        <Input id="ngayThi" name="ngayThi" type="date" defaultValue={ngayThi ?? ""} className="h-8 w-40" />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={dangXuLy}>
        {dangXuLy ? "Đang lưu..." : "Lưu ngày"}
      </Button>
      {kq === "OK" && <span className="text-success">Đã lưu</span>}
      {kq && kq !== "OK" && <span className="text-destructive">{kq}</span>}
    </form>
  );
}

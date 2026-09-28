"use client";

import { useActionState } from "react";
import { dangKyDuThiAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormDangKyDuThi({ khoaId }: { khoaId: string }) {
  const [ketQua, formAction, dangXuLy] = useActionState(dangKyDuThiAction, undefined);

  if (ketQua === "THANH_CONG") {
    return (
      <p className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
        Đăng ký dự thi thành công! Bạn đã có tên trong danh sách thí sinh dự thi của đợt thi này.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="khoaId" value={khoaId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hoTen">Họ tên</Label>
        <Input id="hoTen" name="hoTen" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="soCCCD">Số CCCD</Label>
        <Input id="soCCCD" name="soCCCD" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ngaySinh">Ngày sinh</Label>
        <Input id="ngaySinh" name="ngaySinh" type="date" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="soDienThoai">Số điện thoại</Label>
        <Input id="soDienThoai" name="soDienThoai" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <Button type="submit" disabled={dangXuLy} className="self-start">
        {dangXuLy ? "Đang đăng ký..." : "Đăng ký dự thi"}
      </Button>
      {ketQua && ketQua !== "THANH_CONG" && <p className="text-sm text-destructive">{ketQua}</p>}
    </form>
  );
}

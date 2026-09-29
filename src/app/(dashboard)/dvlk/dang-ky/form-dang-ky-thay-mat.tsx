"use client";

import { useActionState } from "react";
import { dangKyThayMatAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormDangKyThayMat({
  dsKhoa,
}: {
  dsKhoa: { id: string; maKhoa: string; ten: string }[];
}) {
  const [loi, formAction, dangXuLy] = useActionState(dangKyThayMatAction, undefined);

  return (
    <form action={formAction} className="grid max-w-4xl gap-3 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-2">
      <div className="flex flex-col gap-1.5 md:col-span-2">
        <Label htmlFor="khoaId">Khóa đăng ký</Label>
        <select id="khoaId" name="khoaId" required className="h-9 rounded-lg border px-3 text-sm">
          {dsKhoa.map((k) => (
            <option key={k.id} value={k.id}>
              {k.maKhoa} · {k.ten}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hoTen">Họ tên học viên</Label>
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="donViCongTac">Đơn vị công tác</Label>
        <Input id="donViCongTac" name="donViCongTac" />
      </div>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Button type="submit" disabled={dangXuLy}>
          {dangXuLy ? "Đang đăng ký..." : "Đăng ký học viên"}
        </Button>
        {loi && <p className="text-sm text-destructive">{loi}</p>}
      </div>
    </form>
  );
}

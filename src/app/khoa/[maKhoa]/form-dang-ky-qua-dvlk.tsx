"use client";

import { useActionState } from "react";
import { dangKyQuaDonViLienKetAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormDangKyQuaDVLK({
  khoaId,
  maKhoa,
  dsDonViLienKet,
}: {
  khoaId: string;
  maKhoa: string;
  dsDonViLienKet: { id: string; ten: string }[];
}) {
  const [loi, formAction, dangXuLy] = useActionState(dangKyQuaDonViLienKetAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <input type="hidden" name="khoaId" value={khoaId} />
      <input type="hidden" name="maKhoa" value={maKhoa} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="donViLienKetId">Đơn vị liên kết sẽ nộp hồ sơ giấy</Label>
        <select
          id="donViLienKetId"
          name="donViLienKetId"
          required
          className="h-9 rounded-lg border px-3 text-sm"
        >
          {dsDonViLienKet.map((dv) => (
            <option key={dv.id} value={dv.id}>
              {dv.ten}
            </option>
          ))}
        </select>
      </div>
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="donViCongTac">Đơn vị công tác</Label>
        <Input id="donViCongTac" name="donViCongTac" />
      </div>
      <Button type="submit" disabled={dangXuLy}>
        {dangXuLy ? "Đang đăng ký..." : "Đăng ký"}
      </Button>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { luuCauHinhSmtpAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CauHinhHienTai = {
  host: string;
  port: number;
  taiKhoan: string;
  tuDiaChi: string;
  capNhatLuc: string;
} | null;

export function FormCauHinhSmtp({ cauHinh }: { cauHinh: CauHinhHienTai }) {
  const [loi, formAction, dangLuu] = useActionState(luuCauHinhSmtpAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      {cauHinh ? (
        <p className="text-sm text-muted-foreground">
          Đã cấu hình lần cuối: {new Date(cauHinh.capNhatLuc).toLocaleString("vi-VN")} - đang gửi
          từ {cauHinh.taiKhoan}@{cauHinh.host}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Chưa cấu hình SMTP - thông báo sự kiện (HV-10) vẫn được ghi nhận trong hệ thống nhưng
          chưa gửi được email thật.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="host">SMTP host</Label>
          <Input id="host" name="host" defaultValue={cauHinh?.host} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            name="port"
            type="number"
            defaultValue={cauHinh?.port ?? 587}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="taiKhoan">Tài khoản đăng nhập</Label>
          <Input id="taiKhoan" name="taiKhoan" defaultValue={cauHinh?.taiKhoan} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="matKhau">Mật khẩu/App password</Label>
          <Input
            id="matKhau"
            name="matKhau"
            type="password"
            placeholder={cauHinh ? "Để trống nếu giữ nguyên..." : ""}
            required={!cauHinh}
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="tuDiaChi">Địa chỉ email gửi đi (From)</Label>
          <Input
            id="tuDiaChi"
            name="tuDiaChi"
            type="email"
            defaultValue={cauHinh?.tuDiaChi}
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={dangLuu} className="self-start">
        {dangLuu ? "Đang lưu..." : "Lưu cấu hình"}
      </Button>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
    </form>
  );
}

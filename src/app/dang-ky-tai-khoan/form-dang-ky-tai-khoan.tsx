"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { dangKyTaiKhoanAction } from "./actions";
import { guiGiuDuLieu } from "@/components/dang-ky/gui-giu-du-lieu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OEmail } from "@/components/chung/o-email";

const Sao = () => <span className="text-destructive">*</span>;

export function FormDangKyTaiKhoan() {
  const [loi, formAction, dangXuLy] = useActionState(dangKyTaiKhoanAction, undefined);
  const callbackUrl = useSearchParams().get("callbackUrl") ?? "";
  return (
    <form onSubmit={guiGiuDuLieu(formAction)} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="hoTen">
          Họ và tên <Sao />
        </Label>
        <Input id="hoTen" name="hoTen" required autoComplete="name" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="soCCCD">
          Số CCCD (tên đăng nhập) <Sao />
        </Label>
        <Input id="soCCCD" name="soCCCD" required inputMode="numeric" pattern="\d{12}" maxLength={12} title="12 chữ số" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ngaySinh">
          Ngày sinh <Sao />
        </Label>
        <Input id="ngaySinh" name="ngaySinh" type="date" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="soDienThoai">
          Số điện thoại <Sao />
        </Label>
        <Input id="soDienThoai" name="soDienThoai" type="tel" required autoComplete="tel" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <OEmail id="email" name="email" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="matKhau">
          Mật khẩu <Sao />
        </Label>
        <Input id="matKhau" name="matKhau" type="password" required minLength={8} autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">Ít nhất 8 ký tự, gồm cả chữ và số.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nhapLaiMatKhau">
          Nhập lại mật khẩu <Sao />
        </Label>
        <Input id="nhapLaiMatKhau" name="nhapLaiMatKhau" type="password" required autoComplete="new-password" />
      </div>
      {loi && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
          {loi}
        </p>
      )}
      <Button type="submit" disabled={dangXuLy} className="h-11 text-base sm:col-span-2">
        {dangXuLy ? "Đang tạo tài khoản..." : "Đăng ký tài khoản"}
      </Button>
      <p className="text-center text-sm text-muted-foreground sm:col-span-2">
        Đã có tài khoản?{" "}
        <Link href={`/dang-nhap${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`} className="font-medium text-primary underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}

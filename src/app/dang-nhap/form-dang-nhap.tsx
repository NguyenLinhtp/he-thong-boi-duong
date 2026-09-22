"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { dangNhap } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormDangNhap() {
  const [loi, formAction, dangXuLy] = useActionState(dangNhap, undefined);
  const searchParams = useSearchParams();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="callbackUrl" value={searchParams.get("callbackUrl") ?? ""} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dinhDanh">Tên đăng nhập / CCCD / Mã số</Label>
        <Input id="dinhDanh" name="dinhDanh" required autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="matKhau">Mật khẩu</Label>
        <Input id="matKhau" name="matKhau" type="password" required />
      </div>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
      <Button type="submit" disabled={dangXuLy}>
        {dangXuLy ? "Đang đăng nhập..." : "Đăng nhập"}
      </Button>
    </form>
  );
}

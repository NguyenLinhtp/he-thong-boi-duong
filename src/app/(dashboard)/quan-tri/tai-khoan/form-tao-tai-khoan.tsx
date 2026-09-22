"use client";

import { useActionState } from "react";
import { taoTaiKhoanAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const DANH_SACH_VAI_TRO = [
  { ma: "ADMIN", ten: "Quản trị hệ thống" },
  { ma: "CAN_BO_QUAN_LY_DAO_TAO", ten: "Cán bộ quản lý đào tạo" },
  { ma: "CAN_BO_TAI_CHINH", ten: "Cán bộ tài chính" },
  { ma: "GIANG_VIEN", ten: "Giảng viên" },
  { ma: "HOC_VIEN", ten: "Học viên" },
  { ma: "CAN_BO_DON_VI_LIEN_KET", ten: "Cán bộ đơn vị liên kết" },
] as const;

export function FormTaoTaiKhoan() {
  const [loi, formAction, dangXuLy] = useActionState(taoTaiKhoanAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-sm font-semibold">Tạo tài khoản mới</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tenDangNhap">Tên đăng nhập</Label>
          <Input id="tenDangNhap" name="tenDangNhap" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="matKhau">Mật khẩu ban đầu</Label>
          <Input id="matKhau" name="matKhau" type="password" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hoTen">Họ tên</Label>
          <Input id="hoTen" name="hoTen" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email (tùy chọn)</Label>
          <Input id="email" name="email" type="email" />
        </div>
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <Label>Vai trò</Label>
        <div className="flex flex-wrap gap-3">
          {DANH_SACH_VAI_TRO.map((vt) => (
            <label key={vt.ma} className="flex items-center gap-1.5 text-sm">
              <Checkbox name="vaiTros" value={vt.ma} />
              {vt.ten}
            </label>
          ))}
        </div>
      </fieldset>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
      <Button type="submit" disabled={dangXuLy} className="self-start">
        {dangXuLy ? "Đang tạo..." : "Tạo tài khoản"}
      </Button>
    </form>
  );
}

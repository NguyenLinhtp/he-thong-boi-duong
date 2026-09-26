"use client";

import { useActionState } from "react";
import { capTaiKhoanAction, ganTaiKhoanAction, thuHoiTaiKhoanAction } from "../actions";
import { ThongDiepDvlk } from "../cac-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** DVLK-02: cấp tài khoản mới hoặc gắn tài khoản có sẵn (khi đơn vị chưa có tài khoản). */
export function FormCapTaiKhoan({
  donViId,
  dsTaiKhoanChuaGan,
}: {
  donViId: string;
  dsTaiKhoanChuaGan: { id: string; tenDangNhap: string; hoTen: string }[];
}) {
  const [ketQuaCap, capAction, dangCap] = useActionState(capTaiKhoanAction, undefined);
  const [ketQuaGan, ganAction, dangGan] = useActionState(ganTaiKhoanAction, undefined);
  return (
    <div className="flex flex-col gap-3">
      <form action={capAction} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={donViId} />
        <div className="flex flex-wrap items-end gap-2">
          <Input name="tenDangNhap" placeholder="Tên đăng nhập" required className="w-44" />
          <Input name="hoTen" placeholder="Họ tên cán bộ phụ trách" required className="w-56" />
          <Input name="email" type="email" placeholder="Email (không bắt buộc)" className="w-56" />
          <Input
            name="matKhau"
            type="password"
            placeholder="Mật khẩu (≥ 8 ký tự, có chữ và số)"
            required
            className="w-64"
            autoComplete="new-password"
          />
          <Button type="submit" size="sm" disabled={dangCap}>
            {dangCap ? "Đang cấp..." : "Cấp tài khoản"}
          </Button>
        </div>
        <ThongDiepDvlk ketQua={ketQuaCap} />
      </form>
      {dsTaiKhoanChuaGan.length > 0 && (
        <form action={ganAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={donViId} />
          <span className="text-sm text-muted-foreground">hoặc gắn tài khoản đã tạo ở QT-01:</span>
          <select name="nguoiDungId" required className="h-8 rounded-lg border px-2 text-sm">
            {dsTaiKhoanChuaGan.map((tk) => (
              <option key={tk.id} value={tk.id}>
                {tk.tenDangNhap} · {tk.hoTen}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="secondary" disabled={dangGan}>
            Gắn
          </Button>
          <ThongDiepDvlk ketQua={ketQuaGan} />
        </form>
      )}
    </div>
  );
}

export function NutThuHoiTaiKhoan({ donViId, tenDangNhap }: { donViId: string; tenDangNhap: string }) {
  const [ketQua, formAction, dangXuLy] = useActionState(thuHoiTaiKhoanAction, undefined);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Thu hồi và tạm khóa tài khoản ${tenDangNhap}?`)) e.preventDefault();
      }}
      className="flex flex-col gap-1"
    >
      <input type="hidden" name="id" value={donViId} />
      <Button type="submit" size="sm" variant="destructive" disabled={dangXuLy}>
        Thu hồi tài khoản
      </Button>
      <ThongDiepDvlk ketQua={ketQua} />
    </form>
  );
}

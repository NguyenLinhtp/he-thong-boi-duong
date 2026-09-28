"use client";

import { useActionState, useState } from "react";
import {
  khoaTaiKhoanAction,
  moKhoaTaiKhoanAction,
  xoaTaiKhoanAction,
  ganVaiTroAction,
  datLaiMatKhauAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";
import type { VaiTro } from "@/generated/prisma/client";

const DANH_SACH_VAI_TRO: { ma: VaiTro; ten: string }[] = [
  { ma: "ADMIN", ten: "Quản trị hệ thống" },
  { ma: "CAN_BO_QUAN_LY_DAO_TAO", ten: "Cán bộ quản lý đào tạo" },
  { ma: "CAN_BO_TAI_CHINH", ten: "Cán bộ tài chính" },
  { ma: "GIANG_VIEN", ten: "Giảng viên" },
  { ma: "HOC_VIEN", ten: "Học viên" },
  { ma: "CAN_BO_DON_VI_LIEN_KET", ten: "Cán bộ đơn vị liên kết" },
];

export type TaiKhoanDong = {
  id: string;
  tenDangNhap: string;
  hoTen: string;
  trangThai: "HOAT_DONG" | "TAM_KHOA";
  vaiTros: VaiTro[];
};

export function HangTaiKhoan({ taiKhoan }: { taiKhoan: TaiKhoanDong }) {
  const [moRong, setMoRong] = useState(false);
  const [loiMatKhau, formActionMatKhau, dangDatLaiMatKhau] = useActionState(
    datLaiMatKhauAction,
    undefined,
  );

  return (
    <>
      <TableRow>
        <TableCell>{taiKhoan.tenDangNhap}</TableCell>
        <TableCell>{taiKhoan.hoTen}</TableCell>
        <TableCell>
          <NhanTrangThai ma={taiKhoan.trangThai}>
            {taiKhoan.trangThai === "HOAT_DONG" ? "Hoạt động" : "Tạm khóa"}
          </NhanTrangThai>
        </TableCell>
        <TableCell className="whitespace-normal">
          {taiKhoan.vaiTros.map((v) => DANH_SACH_VAI_TRO.find((vt) => vt.ma === v)?.ten ?? v).join(", ")}
        </TableCell>
        <TableCell className="flex flex-wrap gap-1.5">
          {taiKhoan.trangThai === "HOAT_DONG" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => khoaTaiKhoanAction(taiKhoan.id)}
            >
              Khóa
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => moKhoaTaiKhoanAction(taiKhoan.id)}
            >
              Mở khóa
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setMoRong((v) => !v)}>
            {moRong ? "Ẩn" : "Sửa vai trò/mật khẩu"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (confirm(`Xóa tài khoản "${taiKhoan.tenDangNhap}"?`)) {
                xoaTaiKhoanAction(taiKhoan.id);
              }
            }}
          >
            Xóa
          </Button>
        </TableCell>
      </TableRow>
      {moRong && (
        <TableRow>
          <TableCell colSpan={5}>
            <div className="flex flex-col gap-3 py-2">
              <form
                action={(formData) => ganVaiTroAction(taiKhoan.id, formData)}
                className="flex flex-wrap items-center gap-3"
              >
                {DANH_SACH_VAI_TRO.map((vt) => (
                  <label key={vt.ma} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      name="vaiTros"
                      value={vt.ma}
                      defaultChecked={taiKhoan.vaiTros.includes(vt.ma)}
                    />
                    {vt.ten}
                  </label>
                ))}
                <Button size="sm" type="submit">
                  Lưu vai trò
                </Button>
              </form>

              <form action={formActionMatKhau} className="flex items-center gap-2">
                <input type="hidden" name="nguoiDungId" value={taiKhoan.id} />
                <Input
                  name="matKhauMoi"
                  type="password"
                  placeholder="Mật khẩu mới"
                  required
                  className="max-w-56"
                />
                <Button size="sm" type="submit" disabled={dangDatLaiMatKhau}>
                  Đặt lại mật khẩu
                </Button>
                {loiMatKhau && <span className="text-sm text-destructive">{loiMatKhau}</span>}
              </form>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

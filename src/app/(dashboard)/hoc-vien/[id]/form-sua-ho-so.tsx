"use client";

import { useActionState } from "react";
import { capNhatHoSoAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormSuaHoSo({
  hocVien,
  hocVienTuCapNhat = false,
  dsChucDanhHocVi,
}: {
  // HV-08: học viên tự cập nhật - họ tên/CCCD chỉ cán bộ sửa
  hocVienTuCapNhat?: boolean;
  hocVien: {
    id: string;
    hoTen: string;
    ngaySinh: Date | null;
    donViCongTac: string | null;
    chucDanhHocViId: string | null;
    soCCCD: string | null;
    soDienThoai: string | null;
    email: string | null;
  };
  dsChucDanhHocVi: { id: string; ten: string }[];
}) {
  const [loi, formAction, dangXuLy] = useActionState(capNhatHoSoAction, undefined);

  // key theo giá trị đang lưu: React 19 tự reset form sau action về giá trị lúc mount
  return (
    <form key={JSON.stringify(hocVien)} action={formAction} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <input type="hidden" name="id" value={hocVien.id} />
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hoTen">Họ tên</Label>
          <Input id="hoTen" name="hoTen" defaultValue={hocVien.hoTen} required readOnly={hocVienTuCapNhat} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="soCCCD">Số CCCD</Label>
          <Input id="soCCCD" name="soCCCD" defaultValue={hocVien.soCCCD ?? ""} readOnly={hocVienTuCapNhat} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ngaySinh">Ngày sinh</Label>
          <Input
            id="ngaySinh"
            name="ngaySinh"
            type="date"
            defaultValue={hocVien.ngaySinh ? hocVien.ngaySinh.toISOString().slice(0, 10) : ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="soDienThoai">Số điện thoại</Label>
          <Input id="soDienThoai" name="soDienThoai" defaultValue={hocVien.soDienThoai ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={hocVien.email ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="donViCongTac">Đơn vị công tác</Label>
          <Input id="donViCongTac" name="donViCongTac" defaultValue={hocVien.donViCongTac ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="chucDanhHocViId">Chức danh/học vị</Label>
          <select
            id="chucDanhHocViId"
            name="chucDanhHocViId"
            defaultValue={hocVien.chucDanhHocViId ?? ""}
            className="h-8 rounded-lg border px-2 text-sm"
          >
            <option value="">— Không có —</option>
            {dsChucDanhHocVi.map((cd) => (
              <option key={cd.id} value={cd.id}>
                {cd.ten}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button type="submit" disabled={dangXuLy} className="self-start">
        {dangXuLy ? "Đang lưu..." : "Lưu thông tin"}
      </Button>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
    </form>
  );
}

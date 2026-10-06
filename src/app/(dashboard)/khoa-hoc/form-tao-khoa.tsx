"use client";

import { useActionState } from "react";
import { khoiTaoKhoaAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormTaoKhoa({
  dsChuongTrinh,
}: {
  dsChuongTrinh: { id: string; maCT: string; ten: string }[];
}) {
  const [loi, formAction, dangXuLy] = useActionState(khoiTaoKhoaAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="chuongTrinhId">Chương trình (đã ban hành)</Label>
        <select
          id="chuongTrinhId"
          name="chuongTrinhId"
          required
          className="h-8 rounded-lg border px-2 text-sm"
        >
          {dsChuongTrinh.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {ct.maCT} · {ct.ten}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-72 flex-1 flex-col gap-1.5">
        <Label htmlFor="tenKhoa">Tên khóa</Label>
        <Input
          id="tenKhoa"
          name="tenKhoa"
          required
          maxLength={200}
          placeholder="Vd. Thi chuẩn đầu ra tiếng Anh đợt tháng 11 năm 2026"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="siSoToiDa">Sĩ số tối đa</Label>
        <Input id="siSoToiDa" name="siSoToiDa" type="number" min={1} required className="w-28" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="thoiGianKhaiGiang">Ngày khai giảng</Label>
        <Input id="thoiGianKhaiGiang" name="thoiGianKhaiGiang" type="date" className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="thoiGianBeGiang">Ngày bế giảng</Label>
        <Input id="thoiGianBeGiang" name="thoiGianBeGiang" type="date" className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hanDangKy">Hạn đăng ký</Label>
        <Input id="hanDangKy" name="hanDangKy" type="date" className="w-40" />
      </div>
      <Button type="submit" disabled={dangXuLy}>
        {dangXuLy ? "Đang tạo..." : "Khởi tạo khóa (Chuẩn bị)"}
      </Button>
      {loi && <p className="w-full text-sm text-destructive">{loi}</p>}
    </form>
  );
}

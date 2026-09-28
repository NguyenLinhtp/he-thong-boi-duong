"use client";

import { useActionState } from "react";
import { taoChuongTrinhAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormTaoChuongTrinh({
  dsLoaiHinh,
}: {
  dsLoaiHinh: { id: string; ten: string }[];
}) {
  const [, formAction, dangXuLy] = useActionState(taoChuongTrinhAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ten">Tên chương trình</Label>
        <Input id="ten" name="ten" required className="w-64" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="loaiHinhBoiDuongId">Loại hình</Label>
        <select
          id="loaiHinhBoiDuongId"
          name="loaiHinhBoiDuongId"
          required
          className="h-8 rounded-lg border px-2 text-sm"
        >
          {dsLoaiHinh.map((lh) => (
            <option key={lh.id} value={lh.id}>
              {lh.ten}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="loaiVanBang">Văn bằng cấp khi hoàn thành</Label>
        <select id="loaiVanBang" name="loaiVanBang" defaultValue="CHUNG_CHI" className="h-8 rounded-lg border px-2 text-sm">
          <option value="CHUNG_CHI">Chứng chỉ</option>
          <option value="CHUNG_NHAN">Giấy chứng nhận</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tongThoiLuong">Tổng thời lượng (tiết)</Label>
        <Input id="tongThoiLuong" name="tongThoiLuong" type="number" min={0} className="w-32" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="doiTuongApDung">Đối tượng áp dụng</Label>
        <Input id="doiTuongApDung" name="doiTuongApDung" className="w-56" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mucTieu">Mục tiêu</Label>
        <Input id="mucTieu" name="mucTieu" className="w-64" />
      </div>
      <Button type="submit" disabled={dangXuLy}>
        {dangXuLy ? "Đang tạo..." : "Tạo chương trình (Dự thảo)"}
      </Button>
    </form>
  );
}

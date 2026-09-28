"use client";

import { useActionState } from "react";
import { suaChuongTrinhAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ChuongTrinhSua = {
  id: string;
  ten: string;
  mucTieu: string | null;
  doiTuongApDung: string | null;
  tongThoiLuong: number | null;
  loaiHinhBoiDuongId: string;
};

export function FormSuaChuongTrinh({
  chuongTrinh,
  dsLoaiHinh,
}: {
  chuongTrinh: ChuongTrinhSua;
  dsLoaiHinh: { id: string; ten: string }[];
}) {
  const [loi, formAction, dangXuLy] = useActionState(suaChuongTrinhAction, undefined);

  // key theo giá trị đang lưu: React 19 tự reset form sau action về giá trị lúc mount
  return (
    <form key={JSON.stringify(chuongTrinh)} action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <input type="hidden" name="id" value={chuongTrinh.id} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ten">Tên chương trình</Label>
        <Input id="ten" name="ten" defaultValue={chuongTrinh.ten} required className="w-64" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="loaiHinhBoiDuongId">Loại hình</Label>
        <select
          id="loaiHinhBoiDuongId"
          name="loaiHinhBoiDuongId"
          defaultValue={chuongTrinh.loaiHinhBoiDuongId}
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
        <Label htmlFor="tongThoiLuong">Tổng thời lượng (tiết)</Label>
        <Input
          id="tongThoiLuong"
          name="tongThoiLuong"
          type="number"
          min={0}
          defaultValue={chuongTrinh.tongThoiLuong ?? undefined}
          className="w-32"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="doiTuongApDung">Đối tượng áp dụng</Label>
        <Input
          id="doiTuongApDung"
          name="doiTuongApDung"
          defaultValue={chuongTrinh.doiTuongApDung ?? undefined}
          className="w-56"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mucTieu">Mục tiêu</Label>
        <Input
          id="mucTieu"
          name="mucTieu"
          defaultValue={chuongTrinh.mucTieu ?? undefined}
          className="w-64"
        />
      </div>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
      <Button type="submit" disabled={dangXuLy}>
        {dangXuLy ? "Đang lưu..." : "Lưu"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { themBuoiHocAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormBuoiHoc({
  khoaId,
  dsHocPhan,
  dsPhongHoc,
  dsLop = [],
}: {
  khoaId: string;
  dsHocPhan: { id: string; ten: string }[];
  dsPhongHoc: { id: string; ten: string }[];
  dsLop?: { id: string; maLop: string; ten: string }[];
}) {
  const [loi, formAction, dangXuLy] = useActionState(themBuoiHocAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <input type="hidden" name="khoaId" value={khoaId} />
      {dsLop.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lopId">Lớp (KH-07)</Label>
          <select id="lopId" name="lopId" className="h-8 rounded-lg border px-2 text-sm">
            <option value="">— Cả khóa —</option>
            {dsLop.map((lop) => (
              <option key={lop.id} value={lop.id}>
                {lop.maLop} · {lop.ten}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hocPhanId">Học phần</Label>
        <select id="hocPhanId" name="hocPhanId" className="h-8 rounded-lg border px-2 text-sm">
          <option value="">— Không gắn học phần —</option>
          {dsHocPhan.map((hp) => (
            <option key={hp.id} value={hp.id}>
              {hp.ten}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ngayHoc">Ngày học</Label>
        <Input id="ngayHoc" name="ngayHoc" type="date" required className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gioBatDau">Giờ bắt đầu</Label>
        <Input id="gioBatDau" name="gioBatDau" type="time" className="w-28" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gioKetThuc">Giờ kết thúc</Label>
        <Input id="gioKetThuc" name="gioKetThuc" type="time" className="w-28" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phongHocId">Phòng học</Label>
        <select id="phongHocId" name="phongHocId" className="h-8 rounded-lg border px-2 text-sm">
          <option value="">— Trực tuyến / chưa xếp —</option>
          {dsPhongHoc.map((ph) => (
            <option key={ph.id} value={ph.id}>
              {ph.ten}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="linkTrucTuyen">Link trực tuyến</Label>
        <Input id="linkTrucTuyen" name="linkTrucTuyen" type="url" className="w-48" />
      </div>
      <Button type="submit" disabled={dangXuLy}>
        {dangXuLy ? "Đang thêm..." : "Thêm vào thời khóa biểu"}
      </Button>
      {loi && <p className="w-full text-sm text-destructive">{loi}</p>}
    </form>
  );
}

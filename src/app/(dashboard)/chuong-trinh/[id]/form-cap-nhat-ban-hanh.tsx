"use client";

import { useActionState } from "react";
import { suaChuongTrinhDaBanHanhAction } from "./cap-nhat-ban-hanh-actions";
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
  phienBanHienTai: number;
};

export function FormCapNhatBanHanh({
  chuongTrinh,
  dsLoaiHinh,
  coKhoaDangHoatDong,
}: {
  chuongTrinh: ChuongTrinhSua;
  dsLoaiHinh: { id: string; ten: string }[];
  coKhoaDangHoatDong: boolean;
}) {
  const [loi, formAction, dangXuLy] = useActionState(suaChuongTrinhDaBanHanhAction, undefined);
  const tenLoaiHinhHienTai = dsLoaiHinh.find((lh) => lh.id === chuongTrinh.loaiHinhBoiDuongId)?.ten;

  return (
    <section className="flex flex-col gap-2 rounded-lg border p-4">
      <h2 className="text-base font-semibold">
        CT-04 · Cập nhật chương trình đã ban hành (phiên bản hiện tại: {chuongTrinh.phienBanHienTai})
      </h2>
      {coKhoaDangHoatDong && (
        <p className="text-sm text-amber-600">
          Chương trình đang có khóa hoạt động - chỉ sửa được tên/mục tiêu/đối tượng áp dụng, không
          đổi được loại hình/tổng thời lượng.
        </p>
      )}
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={chuongTrinh.id} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ten">Tên chương trình</Label>
          <Input id="ten" name="ten" defaultValue={chuongTrinh.ten} required className="w-64" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mucTieu">Mục tiêu</Label>
          <Input id="mucTieu" name="mucTieu" defaultValue={chuongTrinh.mucTieu ?? undefined} className="w-64" />
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

        {coKhoaDangHoatDong ? (
          <>
            {/* Đang có khóa hoạt động: không cho đổi, nhưng vẫn phải gửi
                đúng giá trị hiện tại lên (input disabled không submit). */}
            <input type="hidden" name="loaiHinhBoiDuongId" value={chuongTrinh.loaiHinhBoiDuongId} />
            <input
              type="hidden"
              name="tongThoiLuong"
              value={chuongTrinh.tongThoiLuong ?? ""}
            />
            <div className="flex flex-col gap-1.5 text-sm">
              <Label>Loại hình (không đổi được)</Label>
              <span>{tenLoaiHinhHienTai}</span>
            </div>
            <div className="flex flex-col gap-1.5 text-sm">
              <Label>Tổng thời lượng (không đổi được)</Label>
              <span>{chuongTrinh.tongThoiLuong ?? "—"}</span>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lyDoSua">Lý do sửa</Label>
          <Input id="lyDoSua" name="lyDoSua" className="w-64" />
        </div>
        {loi && <p className="text-sm text-destructive">{loi}</p>}
        <Button type="submit" disabled={dangXuLy}>
          {dangXuLy ? "Đang lưu..." : "Lưu (tạo phiên bản mới)"}
        </Button>
      </form>
    </section>
  );
}

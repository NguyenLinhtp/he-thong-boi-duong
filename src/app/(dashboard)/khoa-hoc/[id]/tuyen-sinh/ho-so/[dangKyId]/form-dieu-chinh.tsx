"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dieuChinhThongTinAction } from "../../actions";

type TruongSua = { ma: string; nhan: string; kieu: string; batBuoc: boolean; luaChon: string[]; coDinh: boolean; giaTri: string };

const O = ({ id, nhan, batBuoc, children }: { id: string; nhan: string; batBuoc?: boolean; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={id}>
      {nhan} {batBuoc && <span className="text-destructive">*</span>}
    </Label>
    {children}
  </div>
);

export function FormDieuChinhThongTin({
  khoaId,
  dangKyId,
  laDuThi,
  giaTri,
  dsTruong,
}: {
  khoaId: string;
  dangKyId: string;
  laDuThi: boolean;
  giaTri: Record<"hoTen" | "soCCCD" | "ngaySinh" | "soDienThoai" | "email" | "donViCongTac" | "soDienThoaiXacThuc", string>;
  dsTruong: TruongSua[];
}) {
  const [kq, formAction, dangXuLy] = useActionState(dieuChinhThongTinAction.bind(null, khoaId, dangKyId), undefined);

  return (
    <form action={formAction} className="grid max-w-3xl gap-4 rounded-lg border bg-card p-4 shadow-sm sm:grid-cols-2">
      <O id="hoTen" nhan="Họ tên" batBuoc>
        <Input id="hoTen" name="hoTen" required defaultValue={giaTri.hoTen} />
      </O>
      <O id="soCCCD" nhan="Số CCCD" batBuoc>
        <Input id="soCCCD" name="soCCCD" required inputMode="numeric" className="font-mono" defaultValue={giaTri.soCCCD} />
      </O>
      <O id="ngaySinh" nhan="Ngày sinh">
        <Input id="ngaySinh" name="ngaySinh" type="date" defaultValue={giaTri.ngaySinh} />
      </O>
      <O id="soDienThoai" nhan="Số điện thoại (hồ sơ)">
        <Input id="soDienThoai" name="soDienThoai" type="tel" defaultValue={giaTri.soDienThoai} />
      </O>
      <O id="email" nhan="Email">
        <Input id="email" name="email" type="email" defaultValue={giaTri.email} />
      </O>
      <O id="donViCongTac" nhan="Đơn vị công tác">
        <Input id="donViCongTac" name="donViCongTac" defaultValue={giaTri.donViCongTac} />
      </O>
      {laDuThi && (
        <O id="soDienThoaiXacThuc" nhan="Số điện thoại xác thực (mở lại đơn)" batBuoc>
          <Input
            id="soDienThoaiXacThuc"
            name="soDienThoaiXacThuc"
            type="tel"
            required
            className="font-mono"
            defaultValue={giaTri.soDienThoaiXacThuc}
          />
        </O>
      )}
      {dsTruong.map((t) => (
        <O key={t.ma} id={`bs_${t.ma}`} nhan={t.nhan} batBuoc={t.batBuoc}>
          {t.luaChon.length > 0 ? (
            <select
              id={`bs_${t.ma}`}
              name={`bs_${t.ma}`}
              defaultValue={t.giaTri}
              required={t.batBuoc}
              disabled={t.coDinh}
              className="h-8 rounded-lg border bg-background px-2 text-sm"
            >
              <option value="">— Chọn —</option>
              {t.luaChon.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={`bs_${t.ma}`}
              name={`bs_${t.ma}`}
              type={t.kieu === "NGAY" ? "date" : t.kieu === "SO" ? "number" : "text"}
              required={t.batBuoc}
              readOnly={t.coDinh}
              defaultValue={t.giaTri}
            />
          )}
        </O>
      ))}
      <div className="sm:col-span-2">
        <O id="lyDo" nhan="Lý do điều chỉnh" batBuoc>
          <Input id="lyDo" name="lyDo" required placeholder="vd. Thí sinh khai sai ngày sinh, đối chiếu CCCD bản gốc" />
        </O>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={dangXuLy}>
          {dangXuLy ? "Đang lưu..." : "Lưu điều chỉnh"}
        </Button>
        {kq?.ok && <span className="text-sm text-success">Đã lưu điều chỉnh và ghi nhật ký.</span>}
        {kq?.loi && <span className="text-sm text-destructive">{kq.loi}</span>}
      </div>
    </form>
  );
}

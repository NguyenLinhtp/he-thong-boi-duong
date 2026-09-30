"use client";

import { useActionState, useState } from "react";
import { dangKyThayMatAction } from "./actions";
import { Button } from "@/components/ui/button";
import { guiGiuDuLieu } from "@/components/dang-ky/gui-giu-du-lieu";
import { Label } from "@/components/ui/label";
import { CacTruongDangKy, TruongDinhDanh } from "@/components/dang-ky/cac-truong-dang-ky";
import type { TruongForm } from "@/lib/form-dang-ky";

// HV-11 (PT4a): các trường theo form cấu hình của khóa đang chọn (bổ sung 30/09/2026)
export function FormDangKyThayMat({
  dsKhoa,
  dsChucDanh,
}: {
  dsKhoa: { id: string; maKhoa: string; ten: string; truong: TruongForm[] }[];
  dsChucDanh: { id: string; ten: string }[];
}) {
  const [loi, formAction, dangXuLy] = useActionState(dangKyThayMatAction, undefined);
  const [khoaId, setKhoaId] = useState(dsKhoa[0]?.id ?? "");
  const khoa = dsKhoa.find((k) => k.id === khoaId);

  return (
    <form onSubmit={guiGiuDuLieu(formAction)} className="grid max-w-4xl gap-4 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-2">
      <div className="flex flex-col gap-1.5 md:col-span-2">
        <Label htmlFor="khoaId">Khóa đăng ký</Label>
        <select
          id="khoaId"
          name="khoaId"
          required
          value={khoaId}
          onChange={(e) => setKhoaId(e.target.value)}
          className="h-9 rounded-lg border px-3 text-sm"
        >
          {dsKhoa.map((k) => (
            <option key={k.id} value={k.id}>
              {k.maKhoa} · {k.ten}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Các mục có dấu <span className="text-destructive">*</span> là bắt buộc theo form đăng ký của khóa.
        </p>
      </div>
      <TruongDinhDanh />
      {/* key theo khóa: đổi khóa thì dựng lại các trường theo form của khóa đó */}
      <CacTruongDangKy key={khoaId} truong={khoa?.truong ?? []} dsChucDanh={dsChucDanh} />
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Button type="submit" disabled={dangXuLy}>
          {dangXuLy ? "Đang đăng ký..." : "Đăng ký học viên"}
        </Button>
        {loi && <p className="text-sm text-destructive">{loi}</p>}
      </div>
    </form>
  );
}

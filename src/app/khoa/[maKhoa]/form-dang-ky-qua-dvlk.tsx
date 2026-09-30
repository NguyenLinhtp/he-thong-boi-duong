"use client";

import { useActionState } from "react";
import { dangKyQuaDonViLienKetAction } from "./actions";
import { Button } from "@/components/ui/button";
import { guiGiuDuLieu } from "@/components/dang-ky/gui-giu-du-lieu";
import { Label } from "@/components/ui/label";
import { CacTruongDangKy, TruongDinhDanh } from "@/components/dang-ky/cac-truong-dang-ky";
import type { DuLieuDungForm } from "./kieu-form";

// HV-12 (PT4b): form theo cấu hình chương trình/khóa (bổ sung 30/09/2026)
export function FormDangKyQuaDVLK({
  khoaId,
  maKhoa,
  dsDonViLienKet,
  form,
}: {
  khoaId: string;
  maKhoa: string;
  dsDonViLienKet: { id: string; ten: string }[];
  form: DuLieuDungForm;
}) {
  const [loi, formAction, dangXuLy] = useActionState(dangKyQuaDonViLienKetAction, undefined);

  return (
    <form onSubmit={guiGiuDuLieu(formAction)} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="khoaId" value={khoaId} />
      <input type="hidden" name="maKhoa" value={maKhoa} />
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="donViLienKetId">
          Đơn vị liên kết sẽ nộp hồ sơ giấy <span className="text-destructive">*</span>
        </Label>
        <select id="donViLienKetId" name="donViLienKetId" required className="h-9 rounded-lg border px-3 text-sm">
          {dsDonViLienKet.map((dv) => (
            <option key={dv.id} value={dv.id}>
              {dv.ten}
            </option>
          ))}
        </select>
      </div>
      <TruongDinhDanh giaTri={form.giaTri ?? undefined} khoa={!!form.giaTri} />
      <CacTruongDangKy truong={form.truong} dsChucDanh={form.dsChucDanh} giaTri={form.giaTri ?? undefined} />
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Button type="submit" disabled={dangXuLy}>
          {dangXuLy ? "Đang đăng ký..." : "Đăng ký"}
        </Button>
        {loi && <p className="text-sm text-destructive">{loi}</p>}
      </div>
    </form>
  );
}

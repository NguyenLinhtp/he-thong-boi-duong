"use client";

import { useActionState } from "react";
import { dangKyDuThiAction, traCuuSinhVienAction } from "./actions";
import { Button } from "@/components/ui/button";
import { guiGiuDuLieu } from "@/components/dang-ky/gui-giu-du-lieu";
import { CacTruongDangKy, TruongDinhDanh } from "@/components/dang-ky/cac-truong-dang-ky";
import { TruongMaSinhVien } from "@/components/dang-ky/truong-ma-sinh-vien";
import type { DuLieuDungForm } from "./kieu-form";

// HV-05 (PT3): form theo cấu hình chương trình/khóa (bổ sung 30/09/2026); định danh bằng mã sinh viên (bổ sung 01/10/2026)
export function FormDangKyDuThi({ khoaId, maKhoa, form }: { khoaId: string; maKhoa: string; form: DuLieuDungForm }) {
  const [loi, formAction, dangXuLy] = useActionState(dangKyDuThiAction, undefined);
  const theoMaSinhVien = form.dinhDanh === "MA_SINH_VIEN";

  return (
    <form onSubmit={guiGiuDuLieu(formAction)} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="khoaId" value={khoaId} />
      <input type="hidden" name="maKhoa" value={maKhoa} />
      {theoMaSinhVien ? (
        <TruongMaSinhVien traCuu={traCuuSinhVienAction.bind(null, khoaId)} />
      ) : (
        <TruongDinhDanh giaTri={form.giaTri ?? undefined} khoa={!!form.giaTri} />
      )}
      <CacTruongDangKy truong={form.truong} dsChucDanh={form.dsChucDanh} giaTri={form.giaTri ?? undefined} />
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Button type="submit" disabled={dangXuLy}>
          {dangXuLy ? "Đang đăng ký..." : "Đăng ký dự thi"}
        </Button>
        {loi && <p className="text-sm text-destructive">{loi}</p>}
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { dangKyDuThiAction } from "./actions";
import { Button } from "@/components/ui/button";
import { guiGiuDuLieu } from "@/components/dang-ky/gui-giu-du-lieu";
import { CacTruongDangKy, TruongDinhDanh } from "@/components/dang-ky/cac-truong-dang-ky";
import type { DuLieuDungForm } from "./kieu-form";

// HV-05 (PT3): form theo cấu hình chương trình/khóa (bổ sung 30/09/2026)
export function FormDangKyDuThi({ khoaId, form }: { khoaId: string; form: DuLieuDungForm }) {
  const [ketQua, formAction, dangXuLy] = useActionState(dangKyDuThiAction, undefined);

  if (ketQua === "THANH_CONG") {
    return (
      <p className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
        Đăng ký dự thi thành công! Bạn đã có tên trong danh sách thí sinh dự thi của đợt thi này.
      </p>
    );
  }

  return (
    <form onSubmit={guiGiuDuLieu(formAction)} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="khoaId" value={khoaId} />
      <TruongDinhDanh giaTri={form.giaTri ?? undefined} khoa={!!form.giaTri} />
      <CacTruongDangKy truong={form.truong} dsChucDanh={form.dsChucDanh} giaTri={form.giaTri ?? undefined} />
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Button type="submit" disabled={dangXuLy}>
          {dangXuLy ? "Đang đăng ký..." : "Đăng ký dự thi"}
        </Button>
        {ketQua && <p className="text-sm text-destructive">{ketQua}</p>}
      </div>
    </form>
  );
}

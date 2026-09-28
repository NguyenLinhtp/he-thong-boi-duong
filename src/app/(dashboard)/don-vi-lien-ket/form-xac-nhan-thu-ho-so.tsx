"use client";

import { useActionState } from "react";
import { ThongDiepDvlk } from "./cac-form";
import type { KetQuaThaoTacDvlk } from "./thuc-hien";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const ID_FORM_XAC_NHAN = "form-xac-nhan-thu-ho-so";

/**
 * DVLK-05: xác nhận đã thu hồ sơ giấy các hồ sơ được tích chọn (checkbox
 * name="dangKyIds" form={ID_FORM_XAC_NHAN} ở bảng) và gửi về trường theo lô.
 * Ngày gửi / hình thức / ghi chú không bắt buộc.
 */
export function FormXacNhanThuHoSo({
  action,
  soChoThu,
  truongAn = {},
}: {
  action: (prev: KetQuaThaoTacDvlk, formData: FormData) => Promise<KetQuaThaoTacDvlk>;
  soChoThu: number;
  truongAn?: Record<string, string>;
}) {
  const [ketQua, formAction, dangXuLy] = useActionState(action, undefined);
  const chonTatCa = (chon: boolean) =>
    document
      .querySelectorAll<HTMLInputElement>(`input[name="dangKyIds"][form="${ID_FORM_XAC_NHAN}"]`)
      .forEach((o) => (o.checked = chon));
  if (soChoThu === 0) {
    return <p className="text-sm text-muted-foreground">Không có hồ sơ nào đang chờ thu hồ sơ giấy.</p>;
  }
  return (
    <form id={ID_FORM_XAC_NHAN} action={formAction} className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm">
      {Object.entries(truongAn).map(([ten, giaTri]) => (
        <input key={ten} type="hidden" name={ten} value={giaTri} />
      ))}
      <div className="flex flex-wrap items-end gap-2">
        <span className="text-sm">
          {soChoThu} hồ sơ chờ thu giấy — tích chọn ở bảng dưới
        </span>
        <Button type="button" size="sm" variant="secondary" onClick={() => chonTatCa(true)}>
          Chọn tất cả
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => chonTatCa(false)}>
          Bỏ chọn
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Input
          name="ngayGui"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          aria-label="Ngày gửi về trường"
          className="w-40"
        />
        <select name="hinhThuc" defaultValue="" className="h-8 rounded-lg border px-2 text-sm" aria-label="Hình thức gửi">
          <option value="">Hình thức gửi (không bắt buộc)</option>
          <option value="Bản giấy">Bản giấy</option>
          <option value="Bản scan">Bản scan</option>
          <option value="Bản giấy và bản scan">Bản giấy và bản scan</option>
        </select>
        <Input name="ghiChu" placeholder="Ghi chú (không bắt buộc)" className="w-56" />
        <Button type="submit" size="sm" disabled={dangXuLy}>
          {dangXuLy ? "Đang xác nhận..." : "Xác nhận đã thu & gửi lô về trường"}
        </Button>
      </div>
      <ThongDiepDvlk ketQua={ketQua} />
    </form>
  );
}

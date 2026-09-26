"use client";

import { useActionState } from "react";
import { taoHopDongAction, capNhatHopDongAction } from "./actions";
import { ThongDiepDvlk } from "../cac-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function CacTruongSoLieu({
  soLuongDuKien,
  donGiaThoaThuan,
  ghiChu,
}: {
  soLuongDuKien?: number | null;
  donGiaThoaThuan?: number | null;
  ghiChu?: string | null;
}) {
  return (
    <>
      <Input
        name="soLuongDuKien"
        type="number"
        min={0}
        step={1}
        defaultValue={soLuongDuKien ?? ""}
        placeholder="Số HV dự kiến"
        aria-label="Số học viên dự kiến"
        className="w-36"
      />
      <Input
        name="donGiaThoaThuan"
        type="number"
        min={0}
        step={1000}
        defaultValue={donGiaThoaThuan ?? ""}
        placeholder="Đơn giá thỏa thuận (đ/HV)"
        aria-label="Đơn giá thỏa thuận"
        className="w-52"
      />
      <Input name="ghiChu" defaultValue={ghiChu ?? ""} placeholder="Ghi chú" className="w-56" />
    </>
  );
}

/** DVLK-03: lập hợp đồng liên kết cho 1 khóa Phương thức 4. */
export function FormTaoHopDong({
  dsDonVi,
  dsKhoa,
  donViMacDinh,
}: {
  dsDonVi: { id: string; ma: string; ten: string }[];
  dsKhoa: { id: string; maKhoa: string; tenChuongTrinh: string }[];
  donViMacDinh?: string;
}) {
  const [ketQua, formAction, dangXuLy] = useActionState(taoHopDongAction, undefined);
  if (dsKhoa.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có khóa nào thuộc chương trình Phương thức 4 (qua đơn vị liên kết) còn mở để lập hợp đồng.
      </p>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-2">
        <select
          name="donViLienKetId"
          required
          defaultValue={donViMacDinh ?? ""}
          className="h-8 rounded-lg border px-2 text-sm"
          aria-label="Đơn vị liên kết"
        >
          <option value="" disabled>
            -- Đơn vị liên kết (đang hợp tác) --
          </option>
          {dsDonVi.map((dv) => (
            <option key={dv.id} value={dv.id}>
              {dv.ma} · {dv.ten}
            </option>
          ))}
        </select>
        <select name="khoaId" required defaultValue="" className="h-8 rounded-lg border px-2 text-sm" aria-label="Khóa">
          <option value="" disabled>
            -- Khóa (Phương thức 4) --
          </option>
          {dsKhoa.map((k) => (
            <option key={k.id} value={k.id}>
              {k.maKhoa} · {k.tenChuongTrinh}
            </option>
          ))}
        </select>
        <CacTruongSoLieu />
        <Button type="submit" disabled={dangXuLy}>
          {dangXuLy ? "Đang lập..." : "Lập hợp đồng"}
        </Button>
      </div>
      <ThongDiepDvlk ketQua={ketQua} />
    </form>
  );
}

export function FormSuaHopDong({
  id,
  soLuongDuKien,
  donGiaThoaThuan,
  ghiChu,
}: {
  id: string;
  soLuongDuKien: number | null;
  donGiaThoaThuan: number | null;
  ghiChu: string | null;
}) {
  const [ketQua, formAction, dangXuLy] = useActionState(capNhatHopDongAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-end gap-2">
        <CacTruongSoLieu soLuongDuKien={soLuongDuKien} donGiaThoaThuan={donGiaThoaThuan} ghiChu={ghiChu} />
        <Button type="submit" size="sm" disabled={dangXuLy}>
          {dangXuLy ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
      <ThongDiepDvlk ketQua={ketQua} />
    </form>
  );
}

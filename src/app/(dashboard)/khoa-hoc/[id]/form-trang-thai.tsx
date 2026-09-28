"use client";

import { useActionState } from "react";
import { chuyenTrangThaiAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const NHAN_TRANG_THAI: Record<string, string> = {
  CHUAN_BI: "Chuẩn bị mở",
  DANG_TUYEN_SINH: "Đang tuyển sinh",
  DANG_DIEN_RA: "Đang diễn ra",
  DA_KET_THUC: "Đã kết thúc",
  HUY: "Hủy",
};

const CHUYEN_TIEP_HOP_LE: Record<string, string[]> = {
  CHUAN_BI: ["DANG_TUYEN_SINH", "HUY"],
  DANG_TUYEN_SINH: ["DANG_DIEN_RA", "HUY"],
  DANG_DIEN_RA: ["DA_KET_THUC", "HUY"],
  DA_KET_THUC: [],
  HUY: [],
};

export function FormTrangThai({ khoaId, trangThaiHienTai }: { khoaId: string; trangThaiHienTai: string }) {
  const [loi, formAction, dangXuLy] = useActionState(chuyenTrangThaiAction, undefined);
  const cacTrangThaiCoTheChuyen = CHUYEN_TIEP_HOP_LE[trangThaiHienTai] ?? [];

  if (cacTrangThaiCoTheChuyen.length === 0) {
    return (
      <p className="rounded-lg border bg-card p-4 shadow-sm text-sm text-muted-foreground">
        Khóa đã ở trạng thái cuối ({NHAN_TRANG_THAI[trangThaiHienTai] ?? trangThaiHienTai}), không thể
        chuyển tiếp.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <input type="hidden" name="khoaId" value={khoaId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="trangThai">Chuyển sang trạng thái</Label>
        <select id="trangThai" name="trangThai" className="h-8 rounded-lg border px-2 text-sm">
          {cacTrangThaiCoTheChuyen.map((tt) => (
            <option key={tt} value={tt}>
              {NHAN_TRANG_THAI[tt] ?? tt}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={dangXuLy}>
        {dangXuLy ? "Đang chuyển..." : "Chuyển trạng thái"}
      </Button>
      {loi && <p className="w-full text-sm text-destructive">{loi}</p>}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { phucHoiAction } from "./actions";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

const NHAN_TRANG_THAI: Record<string, string> = {
  DANG_CHAY: "Đang chạy",
  THANH_CONG: "Thành công",
  THAT_BAI: "Thất bại",
};

const NHAN_LOAI: Record<string, string> = {
  THU_CONG: "Thủ công",
  TU_DONG: "Tự động",
};

function dinhDangDung(byte: number | null) {
  if (byte === null) return "-";
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(1)} KB`;
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`;
}

export type SaoLuuDong = {
  id: string;
  thoiGianBatDau: string;
  thoiGianKetThuc: string | null;
  trangThai: string;
  loaiKichHoat: string;
  nguoiKichHoat: string | null;
  kichThuocByte: number | null;
  loiChiTiet: string | null;
};

export function HangSaoLuu({ banGhi }: { banGhi: SaoLuuDong }) {
  const [loi, formAction, dangXuLy] = useActionState(phucHoiAction, undefined);

  return (
    <TableRow>
      <TableCell>{new Date(banGhi.thoiGianBatDau).toLocaleString("vi-VN")}</TableCell>
      <TableCell>{NHAN_TRANG_THAI[banGhi.trangThai] ?? banGhi.trangThai}</TableCell>
      <TableCell>{NHAN_LOAI[banGhi.loaiKichHoat] ?? banGhi.loaiKichHoat}</TableCell>
      <TableCell>{banGhi.nguoiKichHoat ?? "(hệ thống)"}</TableCell>
      <TableCell>{dinhDangDung(banGhi.kichThuocByte)}</TableCell>
      <TableCell>
        {banGhi.trangThai === "THANH_CONG" && (
          <form
            action={formAction}
            onSubmit={(e) => {
              if (
                !confirm(
                  "Phục hồi sẽ XÓA TOÀN BỘ dữ liệu nghiệp vụ hiện tại và thay bằng dữ liệu của bản sao lưu này. Không thể hoàn tác. Tiếp tục?",
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="saoLuuId" value={banGhi.id} />
            <Button type="submit" size="sm" variant="destructive" disabled={dangXuLy}>
              {dangXuLy ? "Đang phục hồi..." : "Phục hồi"}
            </Button>
          </form>
        )}
        {banGhi.trangThai === "THAT_BAI" && banGhi.loiChiTiet && (
          <span className="text-xs text-destructive">{banGhi.loiChiTiet}</span>
        )}
        {loi && <p className="text-xs text-destructive">{loi}</p>}
      </TableCell>
    </TableRow>
  );
}

import { NextResponse } from "next/server";
import {
  LoiHocLieu,
  KhongPhaiTaiKhoanGiangVienError,
  KhongTimThayTaiLieuError,
  KhongDuocXemTaiLieuError,
} from "@/server/services/gd/loi-giang-day";

/** Lỗi nghiệp vụ GD-04 -> 404/403/400; lỗi khác ném tiếp. */
export function phanHoiLoiHocLieu(error: unknown): Response {
  if (error instanceof KhongTimThayTaiLieuError) return NextResponse.json({ message: error.message }, { status: 404 });
  if (error instanceof KhongDuocXemTaiLieuError || error instanceof KhongPhaiTaiKhoanGiangVienError) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }
  if (error instanceof LoiHocLieu) return NextResponse.json({ message: error.message }, { status: 400 });
  throw error;
}

import { NextResponse } from "next/server";
import {
  LoiLopHoc,
  KhongTimThayLopError,
  KhongTimThayDangKyLopError,
  KhongTimThayKhoaError,
} from "@/server/services/kh/loi-khoa";

/** KH-07: lỗi nghiệp vụ lớp -> 404 (không tìm thấy) / 400 (vi phạm quy tắc); lỗi khác ném tiếp. */
export function phanHoiLoiLop(error: unknown): Response {
  if (
    error instanceof KhongTimThayLopError ||
    error instanceof KhongTimThayDangKyLopError ||
    error instanceof KhongTimThayKhoaError
  ) {
    return NextResponse.json({ message: error.message }, { status: 404 });
  }
  if (error instanceof LoiLopHoc) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  throw error;
}

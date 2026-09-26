import { NextResponse } from "next/server";
import {
  LoiChungChi,
  KhongTimThayKhoaError,
  KhongTimThayChungChiError,
  KhongTimThayHopDongError,
} from "@/server/services/cc/loi-chung-chi";

/** Lỗi nghiệp vụ CC -> 404 (không tìm thấy) / 400 (vi phạm quy tắc); lỗi khác ném tiếp. */
export function phanHoiLoiChungChi(error: unknown): Response {
  if (
    error instanceof KhongTimThayKhoaError ||
    error instanceof KhongTimThayChungChiError ||
    error instanceof KhongTimThayHopDongError
  ) {
    return NextResponse.json({ message: error.message }, { status: 404 });
  }
  if (error instanceof LoiChungChi) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  throw error;
}

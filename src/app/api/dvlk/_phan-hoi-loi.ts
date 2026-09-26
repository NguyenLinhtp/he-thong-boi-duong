import { NextResponse } from "next/server";
import { LoiDonViLienKet } from "@/server/services/dvlk/loi-dvlk";

/** Lỗi nghiệp vụ DVLK -> 404 (không tìm thấy) / 400 (vi phạm quy tắc); lỗi khác ném tiếp. */
export function phanHoiLoiDvlk(error: unknown): Response {
  if (error instanceof LoiDonViLienKet) {
    const khongTimThay = error.message.startsWith("Không tìm thấy");
    return NextResponse.json({ message: error.message }, { status: khongTimThay ? 404 : 400 });
  }
  throw error;
}

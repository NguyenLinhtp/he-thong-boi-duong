import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { danhSachKhoa, khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

export const GET = apiRoute(async () => {
  await requirePermission("KH-01");
  return NextResponse.json(await danhSachKhoa());
});

export const POST = apiRoute(async (req: Request) => {
  await requirePermission("KH-01");
  const body = await req.json();

  try {
    return NextResponse.json(await khoiTaoKhoa(body), { status: 201 });
  } catch (error) {
    if (error instanceof SaiTrangThaiChuongTrinhError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayChuongTrinhError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

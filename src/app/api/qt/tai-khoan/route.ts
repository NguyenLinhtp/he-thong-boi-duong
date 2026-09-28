import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import {
  danhSachTaiKhoan,
  taoTaiKhoan,
  MatKhauYeuError,
  TenDangNhapTrungError,
} from "@/server/services/qt/qt-01-quan-ly-tai-khoan";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

export const GET = apiRoute(async () => {
  await requirePermission("QT-01");
  const taiKhoans = await danhSachTaiKhoan();
  return NextResponse.json(taiKhoans);
});

export const POST = apiRoute(async (req: Request) => {
  const phien = await requirePermission("QT-01");
  const body = await req.json();

  try {
    const taiKhoan = await taoTaiKhoan(body, nguoiTuPhien(phien));
    return NextResponse.json(taiKhoan, { status: 201 });
  } catch (error) {
    if (error instanceof TenDangNhapTrungError || error instanceof MatKhauYeuError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import {
  thietLapPhuongThucDangKy,
  DoiPhuongThucKhiCoKhoaDangHoatDongError,
} from "@/server/services/ct/ct-07-phuong-thuc-dang-ky";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

type Params = { params: Promise<{ id: string }> };

export const PATCH = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("CT-07");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(await thietLapPhuongThucDangKy(id, body.phuongThucDangKy, nguoiTuPhien(phien)));
  } catch (error) {
    if (
      error instanceof SaiTrangThaiChuongTrinhError ||
      error instanceof DoiPhuongThucKhiCoKhoaDangHoatDongError
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayChuongTrinhError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import {
  thietLapPhuongThucDangKy,
  PhuongThucDangKyKhongHopLeError,
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
    // (sửa 08/10/2026) nhận danh sách phuongThucDangKys (vẫn nhận 1 giá trị phuongThucDangKy cũ) + lyDo
    const ds = body.phuongThucDangKys ?? (body.phuongThucDangKy ? [body.phuongThucDangKy] : []);
    return NextResponse.json(await thietLapPhuongThucDangKy(id, ds, body.lyDo ?? null, nguoiTuPhien(phien)));
  } catch (error) {
    if (
      error instanceof SaiTrangThaiChuongTrinhError ||
      error instanceof PhuongThucDangKyKhongHopLeError
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayChuongTrinhError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

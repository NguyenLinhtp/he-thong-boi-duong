import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { phucHoiTuBanSaoLuu } from "@/server/services/qt/qt-04-sao-luu";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";
import {
  KhongTimThayBanSaoLuuError,
  BanSaoLuuChuaSanSangError,
  TepSaoLuuKhongHopLeError,
} from "@/server/services/qt/loi-sao-luu";

type Params = { params: Promise<{ id: string }> };

export const POST = apiRoute(async (_req: Request, { params }: Params) => {
  const phien = await requirePermission("QT-04");
  const { id } = await params;

  try {
    const ketQua = await phucHoiTuBanSaoLuu(id, nguoiTuPhien(phien));
    return NextResponse.json(ketQua);
  } catch (error) {
    if (
      error instanceof KhongTimThayBanSaoLuuError ||
      error instanceof BanSaoLuuChuaSanSangError ||
      error instanceof TepSaoLuuKhongHopLeError
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { xetDieuKienHoanThanh, danhSachXetHoanThanh } from "@/server/services/kq/kq-03-xet-hoan-thanh";
import { phanHoiLoiKetQua } from "@/app/api/kq/_phan-hoi-loi";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

type Params = { params: Promise<{ khoaId: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("KQ-03");
  const { khoaId } = await params;
  return NextResponse.json(await danhSachXetHoanThanh(khoaId));
});

export const POST = apiRoute(async (_req: Request, { params }: Params) => {
  const phien = await requirePermission("KQ-03");
  const { khoaId } = await params;
  try {
    return NextResponse.json(await xetDieuKienHoanThanh(khoaId, nguoiTuPhien(phien)));
  } catch (error) {
    return phanHoiLoiKetQua(error);
  }
});

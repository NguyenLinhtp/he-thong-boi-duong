import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { danhSachThamSo, capNhatThamSo } from "@/server/services/qt/qt-05-tham-so";

export const GET = apiRoute(async () => {
  await requirePermission("QT-05");
  return NextResponse.json(await danhSachThamSo());
});

export const PUT = apiRoute(async (req: Request) => {
  const phien = await requirePermission("QT-05");
  const body = await req.json();
  const thamSo = await capNhatThamSo({
    ma: body.ma,
    giaTri: body.giaTri,
    moTa: body.moTa ?? null,
    nguoiThucHienId: phien.userId,
    nguoiThucHienTen: phien.hoTen,
  });
  return NextResponse.json(thamSo);
});

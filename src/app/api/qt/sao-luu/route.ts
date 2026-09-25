import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { danhSachSaoLuu, chayBackupNgay } from "@/server/services/qt/qt-04-sao-luu";

export const GET = apiRoute(async () => {
  await requirePermission("QT-04");
  const banGhis = await danhSachSaoLuu();
  return NextResponse.json(banGhis);
});

export const POST = apiRoute(async () => {
  const phien = await requirePermission("QT-04");
  const ketQua = await chayBackupNgay(phien.hoTen, "THU_CONG");
  return NextResponse.json(ketQua, { status: 201 });
});

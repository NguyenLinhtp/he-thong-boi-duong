import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { danhSachNhatKy } from "@/server/services/qt/qt-03-nhat-ky";

export const GET = apiRoute(async (req: Request) => {
  await requirePermission("QT-03");
  const { searchParams } = new URL(req.url);
  const dsNhatKy = await danhSachNhatKy({
    doiTuong: searchParams.get("doiTuong") ?? undefined,
    doiTuongId: searchParams.get("doiTuongId") ?? undefined,
  });
  return NextResponse.json(dsNhatKy);
});

import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { danhSachHocVien, phamViHoSoHocVien } from "@/server/services/hv/hv-08-ho-so-hoc-vien";

export const GET = apiRoute(async (req: Request) => {
  const phien = await requirePermission("HV-08");
  const tuKhoa = new URL(req.url).searchParams.get("q") ?? undefined;
  return NextResponse.json(await danhSachHocVien(tuKhoa, await phamViHoSoHocVien(phien.userId)));
});

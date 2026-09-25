import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { danhSachHocVien } from "@/server/services/hv/hv-08-ho-so-hoc-vien";

export const GET = apiRoute(async (req: Request) => {
  await requirePermission("HV-08");
  const tuKhoa = new URL(req.url).searchParams.get("q") ?? undefined;
  return NextResponse.json(await danhSachHocVien(tuKhoa));
});

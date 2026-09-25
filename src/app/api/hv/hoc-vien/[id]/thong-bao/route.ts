import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { danhSachThongBaoCuaHocVien } from "@/server/services/hv/hv-10-thong-bao";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("HV-10");
  const { id } = await params;
  return NextResponse.json(await danhSachThongBaoCuaHocVien(id));
});

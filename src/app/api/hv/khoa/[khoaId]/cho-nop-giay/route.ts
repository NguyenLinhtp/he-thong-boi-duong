import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { danhSachChoNopGiay } from "@/server/services/hv/hv-02-xac-nhan-nop-giay";

type Params = { params: Promise<{ khoaId: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("HV-02");
  const { khoaId } = await params;
  return NextResponse.json(await danhSachChoNopGiay(khoaId));
});

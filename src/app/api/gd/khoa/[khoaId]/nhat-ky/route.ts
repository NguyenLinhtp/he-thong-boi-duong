import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { nhatKyKhoa } from "@/server/services/gd/gd-02-nhat-ky";

type Params = { params: Promise<{ khoaId: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("GD-02");
  const { khoaId } = await params;
  return NextResponse.json(await nhatKyKhoa(khoaId));
});

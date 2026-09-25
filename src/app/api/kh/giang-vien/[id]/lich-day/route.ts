import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { lichDayGiangVien } from "@/server/services/kh/kh-03-thoi-khoa-bieu";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("KH-03");
  const { id } = await params;
  return NextResponse.json(await lichDayGiangVien(id));
});

import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { xoaBuoiHoc } from "@/server/services/kh/kh-03-thoi-khoa-bieu";

type Params = { params: Promise<{ id: string; buoiHocId: string }> };

export const DELETE = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("KH-03");
  const { buoiHocId } = await params;
  await xoaBuoiHoc(buoiHocId);
  return NextResponse.json({ ok: true });
});

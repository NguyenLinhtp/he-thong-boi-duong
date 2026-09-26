import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { capNhatLop, xoaLop } from "@/server/services/kh/kh-07-lop-hoc";
import { phanHoiLoiLop } from "@/app/api/kh/_phan-hoi-loi-lop";

type Params = { params: Promise<{ lopId: string }> };

export const PATCH = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("KH-07");
  const { lopId } = await params;
  const body = await req.json();
  try {
    return NextResponse.json(
      await capNhatLop(lopId, { ten: String(body.ten ?? ""), siSoToiDa: body.siSoToiDa ?? null }),
    );
  } catch (error) {
    return phanHoiLoiLop(error);
  }
});

export const DELETE = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("KH-07");
  const { lopId } = await params;
  try {
    await xoaLop(lopId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return phanHoiLoiLop(error);
  }
});

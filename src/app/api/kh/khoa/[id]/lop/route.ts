import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { danhSachLop, taoLop } from "@/server/services/kh/kh-07-lop-hoc";
import { phanHoiLoiLop } from "@/app/api/kh/_phan-hoi-loi-lop";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("KH-07");
  const { id } = await params;
  return NextResponse.json(await danhSachLop(id));
});

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("KH-07");
  const { id } = await params;
  const body = await req.json();
  try {
    return NextResponse.json(await taoLop(id, { ten: String(body.ten ?? ""), siSoToiDa: body.siSoToiDa ?? null }), {
      status: 201,
    });
  } catch (error) {
    return phanHoiLoiLop(error);
  }
});

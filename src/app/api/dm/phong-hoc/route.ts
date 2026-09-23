import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { MaTrungError } from "@/server/services/shared/loi-danh-muc";
import { danhSachPhongHoc, taoPhongHoc } from "@/server/services/dm/dm-04-phong-hoc";

export const GET = apiRoute(async () => {
  await requirePermission("DM-04");
  return NextResponse.json(await danhSachPhongHoc());
});

export const POST = apiRoute(async (req: Request) => {
  await requirePermission("DM-04");
  const body = await req.json();

  try {
    return NextResponse.json(await taoPhongHoc(body), { status: 201 });
  } catch (error) {
    if (error instanceof MaTrungError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

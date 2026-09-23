import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { MaTrungError } from "@/server/services/shared/loi-danh-muc";
import {
  danhSachChucDanhHocVi,
  taoChucDanhHocVi,
} from "@/server/services/dm/dm-02-chuc-danh-hoc-vi";

export const GET = apiRoute(async () => {
  await requirePermission("DM-02");
  return NextResponse.json(await danhSachChucDanhHocVi());
});

export const POST = apiRoute(async (req: Request) => {
  await requirePermission("DM-02");
  const body = await req.json();

  try {
    return NextResponse.json(await taoChucDanhHocVi(body), { status: 201 });
  } catch (error) {
    if (error instanceof MaTrungError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

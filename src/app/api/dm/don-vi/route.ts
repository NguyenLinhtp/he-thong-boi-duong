import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { MaTrungError } from "@/server/services/shared/loi-danh-muc";
import { danhSachDonVi, taoDonVi } from "@/server/services/dm/dm-01-don-vi";

export const GET = apiRoute(async () => {
  await requirePermission("DM-01");
  return NextResponse.json(await danhSachDonVi());
});

export const POST = apiRoute(async (req: Request) => {
  await requirePermission("DM-01");
  const body = await req.json();

  try {
    return NextResponse.json(await taoDonVi(body), { status: 201 });
  } catch (error) {
    if (error instanceof MaTrungError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

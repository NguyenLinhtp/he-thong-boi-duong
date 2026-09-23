import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { MaTrungError, DangDuocThamChieuError } from "@/server/services/shared/loi-danh-muc";
import { suaDonVi, xoaDonVi } from "@/server/services/dm/dm-01-don-vi";

type Params = { params: Promise<{ id: string }> };

export const PATCH = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("DM-01");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(await suaDonVi(id, body));
  } catch (error) {
    if (error instanceof MaTrungError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

export const DELETE = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("DM-01");
  const { id } = await params;

  try {
    await xoaDonVi(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DangDuocThamChieuError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

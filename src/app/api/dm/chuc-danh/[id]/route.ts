import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { MaTrungError, DangDuocThamChieuError } from "@/server/services/shared/loi-danh-muc";
import {
  suaChucDanhHocVi,
  xoaChucDanhHocVi,
} from "@/server/services/dm/dm-02-chuc-danh-hoc-vi";

type Params = { params: Promise<{ id: string }> };

export const PATCH = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("DM-02");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(await suaChucDanhHocVi(id, body));
  } catch (error) {
    if (error instanceof MaTrungError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

export const DELETE = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("DM-02");
  const { id } = await params;

  try {
    await xoaChucDanhHocVi(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DangDuocThamChieuError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

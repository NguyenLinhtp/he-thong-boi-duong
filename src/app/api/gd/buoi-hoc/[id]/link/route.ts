import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { tinhTrangLinkBuoiHoc, thuHoiLinkTrucTuyen } from "@/server/services/gd/gd-05-link-truc-tuyen";
import { KhongTimThayBuoiHocError } from "@/server/services/kh/loi-khoa";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("GD-05");
  const { id } = await params;

  try {
    return NextResponse.json(await tinhTrangLinkBuoiHoc(id));
  } catch (error) {
    if (error instanceof KhongTimThayBuoiHocError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

export const DELETE = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("GD-05");
  const { id } = await params;

  try {
    return NextResponse.json(await thuHoiLinkTrucTuyen(id));
  } catch (error) {
    if (error instanceof KhongTimThayBuoiHocError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

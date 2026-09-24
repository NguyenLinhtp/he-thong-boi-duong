import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import {
  thietLapHinhThucGiangDay,
  tinhTrangLinkTrucTuyen,
} from "@/server/services/kh/kh-04-hinh-thuc-giang-day";
import { KhongTimThayKhoaError } from "@/server/services/kh/loi-khoa";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("KH-04");
  const { id } = await params;
  return NextResponse.json(await tinhTrangLinkTrucTuyen(id));
});

export const PATCH = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("KH-04");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(await thietLapHinhThucGiangDay(id, body.hinhThucGiangDay));
  } catch (error) {
    if (error instanceof KhongTimThayKhoaError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

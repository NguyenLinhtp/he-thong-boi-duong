import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { linkDangKyCongKhai, phatHanhThongBao } from "@/server/services/kh/kh-06-thong-bao-tuyen-sinh";
import { KhongTimThayKhoaError, KhoaChuaMoDangKyError } from "@/server/services/kh/loi-khoa";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("KH-06");
  const { id } = await params;
  return NextResponse.json({ link: await linkDangKyCongKhai(id) });
});

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("KH-06");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(
      await phatHanhThongBao({ khoaId: id, noiDung: body.noiDung, kenhGui: body.kenhGui ?? [] }),
    );
  } catch (error) {
    if (error instanceof KhoaChuaMoDangKyError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayKhoaError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

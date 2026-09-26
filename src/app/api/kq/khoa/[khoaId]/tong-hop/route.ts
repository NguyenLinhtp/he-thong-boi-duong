import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { tongHopKetQuaKhoa, bangTongHopKetQua } from "@/server/services/kq/kq-02-tong-hop";
import { phanHoiLoiKetQua } from "@/app/api/kq/_phan-hoi-loi";

type Params = { params: Promise<{ khoaId: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("KQ-02");
  const { khoaId } = await params;
  return NextResponse.json(await bangTongHopKetQua(khoaId));
});

export const POST = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("KQ-02");
  const { khoaId } = await params;
  try {
    return NextResponse.json(await tongHopKetQuaKhoa(khoaId));
  } catch (error) {
    return phanHoiLoiKetQua(error);
  }
});

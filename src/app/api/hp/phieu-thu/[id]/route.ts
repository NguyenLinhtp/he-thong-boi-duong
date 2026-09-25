import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { chiTietPhieuThu } from "@/server/services/hp/hp-04-phieu-thu";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("HP-04");
  const { id } = await params;
  const phieuThu = await chiTietPhieuThu(id);
  if (!phieuThu) return NextResponse.json({ message: "Không tìm thấy phiếu thu" }, { status: 404 });
  return NextResponse.json(phieuThu);
});

import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { layKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("KH-01");
  const { id } = await params;
  const khoa = await layKhoa(id);
  if (!khoa) return NextResponse.json({ message: "Không tìm thấy khóa bồi dưỡng" }, { status: 404 });
  return NextResponse.json(khoa);
});

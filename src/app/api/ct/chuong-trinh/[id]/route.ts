import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { layChuongTrinh, suaChuongTrinhDuThao } from "@/server/services/ct/ct-01-tao-chuong-trinh";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("CT-01");
  const { id } = await params;
  const chuongTrinh = await layChuongTrinh(id);
  if (!chuongTrinh) return NextResponse.json({ message: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json(chuongTrinh);
});

export const PATCH = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("CT-01");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(await suaChuongTrinhDuThao(id, body));
  } catch (error) {
    if (error instanceof SaiTrangThaiChuongTrinhError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayChuongTrinhError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

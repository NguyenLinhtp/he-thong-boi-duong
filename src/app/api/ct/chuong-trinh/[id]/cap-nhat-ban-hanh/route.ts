import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import {
  suaChuongTrinhDaBanHanh,
  lichSuPhienBan,
  SuaTruongAnhHuongKhoaDangChayError,
} from "@/server/services/ct/ct-04-cap-nhat-da-ban-hanh";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("CT-04");
  const { id } = await params;
  return NextResponse.json(await lichSuPhienBan(id));
});

export const PATCH = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("CT-04");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(await suaChuongTrinhDaBanHanh(id, body));
  } catch (error) {
    if (
      error instanceof SaiTrangThaiChuongTrinhError ||
      error instanceof SuaTruongAnhHuongKhoaDangChayError
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayChuongTrinhError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

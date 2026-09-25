import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { ngungHieuLucChuongTrinh } from "@/server/services/ct/ct-06-luu-tru";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

type Params = { params: Promise<{ id: string }> };

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("CT-06");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(await ngungHieuLucChuongTrinh(id, body.lyDo));
  } catch (error) {
    if (error instanceof KhongTimThayChuongTrinhError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof SaiTrangThaiChuongTrinhError || error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

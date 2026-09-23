import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { pheDuyet } from "@/server/services/ct/ct-03-phe-duyet";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

type Params = { params: Promise<{ id: string }> };

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("CT-03");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(await pheDuyet(id, body));
  } catch (error) {
    if (error instanceof SaiTrangThaiChuongTrinhError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayChuongTrinhError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

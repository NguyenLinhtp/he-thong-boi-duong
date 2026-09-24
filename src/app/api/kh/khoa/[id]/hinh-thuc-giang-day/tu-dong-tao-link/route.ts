import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { tuDongTaoLinkTrucTuyen } from "@/server/services/kh/kh-04-hinh-thuc-giang-day";
import { KhongTimThayKhoaError, KhoaKhongPhaiTrucTuyenError } from "@/server/services/kh/loi-khoa";

type Params = { params: Promise<{ id: string }> };

export const POST = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("KH-04");
  const { id } = await params;

  try {
    const soBuoiDaGan = await tuDongTaoLinkTrucTuyen(id);
    return NextResponse.json({ soBuoiDaGan });
  } catch (error) {
    if (error instanceof KhoaKhongPhaiTrucTuyenError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayKhoaError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

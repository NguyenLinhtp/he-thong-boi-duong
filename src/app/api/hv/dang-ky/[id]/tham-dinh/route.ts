import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { thamDinhHoSo } from "@/server/services/hv/hv-06-tham-dinh";
import { KhongTimThayDangKyError, SaiTrangThaiThamDinhError } from "@/server/services/hv/loi-hoc-vien";

type Params = { params: Promise<{ id: string }> };

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("HV-06");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(await thamDinhHoSo(id, body.ketQua, body.ghiChu ?? null));
  } catch (error) {
    if (error instanceof SaiTrangThaiThamDinhError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayDangKyError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

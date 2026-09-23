import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { suaHocPhan, xoaHocPhan } from "@/server/services/ct/ct-02-hoc-phan";
import { SaiTrangThaiChuongTrinhError } from "@/server/services/ct/loi-chuong-trinh";

type Params = { params: Promise<{ id: string; hocPhanId: string }> };

export const PATCH = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("CT-02");
  const { hocPhanId } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(await suaHocPhan(hocPhanId, body));
  } catch (error) {
    if (error instanceof SaiTrangThaiChuongTrinhError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

export const DELETE = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("CT-02");
  const { hocPhanId } = await params;

  try {
    await xoaHocPhan(hocPhanId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SaiTrangThaiChuongTrinhError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import {
  danhSachHocPhan,
  themHocPhan,
  sapXepHocPhan,
  tongSoTietHocPhan,
} from "@/server/services/ct/ct-02-hoc-phan";
import { SaiTrangThaiChuongTrinhError } from "@/server/services/ct/loi-chuong-trinh";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("CT-02");
  const { id } = await params;
  const [hocPhans, tongTiet] = await Promise.all([
    danhSachHocPhan(id),
    tongSoTietHocPhan(id),
  ]);
  return NextResponse.json({ hocPhans, tongTiet });
});

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("CT-02");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(await themHocPhan(id, body), { status: 201 });
  } catch (error) {
    if (error instanceof SaiTrangThaiChuongTrinhError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

export const PATCH = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("CT-02");
  const { id } = await params;
  const body = await req.json();

  try {
    await sapXepHocPhan(id, body.thuTuIdMoi);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SaiTrangThaiChuongTrinhError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

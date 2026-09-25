import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import {
  danhSachHocVienTheoKhoa,
  themHocVienVaoKhoa,
} from "@/server/services/hv/hv-09-quan-ly-danh-sach-khoa";
import { KhongTimThayKhoaError, DaDangKyKhoaNayError } from "@/server/services/hv/loi-hoc-vien";

type Params = { params: Promise<{ khoaId: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("HV-09");
  const { khoaId } = await params;
  return NextResponse.json(await danhSachHocVienTheoKhoa(khoaId));
});

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("HV-09");
  const { khoaId } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(
      await themHocVienVaoKhoa({
        khoaId,
        hoTen: body.hoTen,
        soCCCD: body.soCCCD,
        ngaySinh: body.ngaySinh ?? null,
        soDienThoai: body.soDienThoai ?? null,
        email: body.email ?? null,
        donViCongTac: body.donViCongTac ?? null,
        lyDo: body.lyDo ?? null,
      }),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DaDangKyKhoaNayError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayKhoaError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

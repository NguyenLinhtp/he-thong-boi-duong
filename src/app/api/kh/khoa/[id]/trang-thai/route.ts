import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { chuyenTrangThaiKhoa, tinhTrangSiSo } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { KhongTimThayKhoaError, ChuyenTrangThaiKhoaKhongHopLeError } from "@/server/services/kh/loi-khoa";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("KH-05");
  const { id } = await params;
  return NextResponse.json(await tinhTrangSiSo(id));
});

export const PATCH = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("KH-05");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(await chuyenTrangThaiKhoa(id, body.trangThai));
  } catch (error) {
    if (error instanceof ChuyenTrangThaiKhoaKhongHopLeError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayKhoaError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

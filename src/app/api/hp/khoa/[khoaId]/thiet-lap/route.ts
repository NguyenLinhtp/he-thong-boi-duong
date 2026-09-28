import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { thietLapHocPhi, hocPhiCuaKhoa } from "@/server/services/hp/hp-01-thiet-lap";
import {
  KhongTimThayKhoaError,
  ThieuLyDoDieuChinhHocPhiError,
} from "@/server/services/hp/loi-hoc-phi";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

type Params = { params: Promise<{ khoaId: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("HP-01");
  const { khoaId } = await params;
  return NextResponse.json(await hocPhiCuaKhoa(khoaId));
});

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("HP-01");
  const { khoaId } = await params;
  const body = await req.json();

  try {
    const khoa = await thietLapHocPhi(khoaId, body, nguoiTuPhien(phien));
    return NextResponse.json(khoa);
  } catch (error) {
    if (error instanceof ThieuLyDoDieuChinhHocPhiError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayKhoaError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

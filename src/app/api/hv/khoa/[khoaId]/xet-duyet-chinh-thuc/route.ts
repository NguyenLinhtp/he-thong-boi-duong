import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import {
  xetDuyetDanhSachChinhThuc,
  danhSachChinhThuc,
} from "@/server/services/hv/hv-07-xet-duyet-chinh-thuc";
import {
  KhongTimThayKhoaError,
  DanhSachXetDuyetRongError,
  DanhSachXetDuyetKhongHopLeError,
  VuotSiSoKhiXetDuyetError,
} from "@/server/services/hv/loi-hoc-vien";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

type Params = { params: Promise<{ khoaId: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("HV-07");
  const { khoaId } = await params;
  return NextResponse.json(await danhSachChinhThuc(khoaId));
});

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("HV-07");
  const { khoaId } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(await xetDuyetDanhSachChinhThuc(khoaId, body.dsDangKyId ?? [], nguoiTuPhien(phien)));
  } catch (error) {
    if (
      error instanceof DanhSachXetDuyetRongError ||
      error instanceof DanhSachXetDuyetKhongHopLeError ||
      error instanceof VuotSiSoKhiXetDuyetError
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayKhoaError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

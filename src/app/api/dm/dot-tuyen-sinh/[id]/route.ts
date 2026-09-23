import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import {
  MaTrungError,
  DangDuocThamChieuError,
  ChongLapThoiGianError,
} from "@/server/services/shared/loi-danh-muc";
import {
  suaDotTuyenSinh,
  xoaDotTuyenSinh,
} from "@/server/services/dm/dm-05-dot-tuyen-sinh";

type Params = { params: Promise<{ id: string }> };

export const PATCH = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("DM-05");
  const { id } = await params;
  const body = await req.json();

  try {
    const ketQua = await suaDotTuyenSinh(id, {
      ma: body.ma,
      ten: body.ten,
      ngayBatDau: new Date(body.ngayBatDau),
      ngayKetThuc: new Date(body.ngayKetThuc),
    });
    return NextResponse.json(ketQua);
  } catch (error) {
    if (error instanceof MaTrungError || error instanceof ChongLapThoiGianError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

export const DELETE = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("DM-05");
  const { id } = await params;

  try {
    await xoaDotTuyenSinh(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DangDuocThamChieuError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

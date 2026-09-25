import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { xacNhanNopGiay } from "@/server/services/hv/hv-02-xac-nhan-nop-giay";
import {
  KhongTimThayDangKyError,
  SaiTrangThaiXacNhanNopGiayError,
  DaQuaHanNopGiayError,
} from "@/server/services/hv/loi-hoc-vien";

type Params = { params: Promise<{ id: string }> };

export const POST = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("HV-02");
  const { id } = await params;

  try {
    return NextResponse.json(await xacNhanNopGiay(id));
  } catch (error) {
    if (error instanceof SaiTrangThaiXacNhanNopGiayError || error instanceof DaQuaHanNopGiayError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayDangKyError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

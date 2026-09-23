import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { MaTrungError, ChongLapThoiGianError } from "@/server/services/shared/loi-danh-muc";
import {
  danhSachDotTuyenSinh,
  taoDotTuyenSinh,
} from "@/server/services/dm/dm-05-dot-tuyen-sinh";

export const GET = apiRoute(async () => {
  await requirePermission("DM-05");
  return NextResponse.json(await danhSachDotTuyenSinh());
});

export const POST = apiRoute(async (req: Request) => {
  await requirePermission("DM-05");
  const body = await req.json();

  try {
    const ketQua = await taoDotTuyenSinh({
      ma: body.ma,
      ten: body.ten,
      ngayBatDau: new Date(body.ngayBatDau),
      ngayKetThuc: new Date(body.ngayKetThuc),
    });
    return NextResponse.json(ketQua, { status: 201 });
  } catch (error) {
    if (error instanceof MaTrungError || error instanceof ChongLapThoiGianError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

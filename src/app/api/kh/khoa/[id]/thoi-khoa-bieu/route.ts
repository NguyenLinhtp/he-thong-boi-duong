import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { danhSachBuoiHoc, thietLapBuoiHoc } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import {
  KhongTimThayKhoaError,
  TrungLichGiangVienTheoBuoiError,
  TrungPhongHocError,
} from "@/server/services/kh/loi-khoa";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("KH-03");
  const { id } = await params;
  return NextResponse.json(await danhSachBuoiHoc(id));
});

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("KH-03");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(
      await thietLapBuoiHoc({
        khoaId: id,
        hocPhanId: body.hocPhanId ?? null,
        ngayHoc: body.ngayHoc,
        gioBatDau: body.gioBatDau ?? null,
        gioKetThuc: body.gioKetThuc ?? null,
        phongHocId: body.phongHocId ?? null,
        linkTrucTuyen: body.linkTrucTuyen ?? null,
      }),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof TrungLichGiangVienTheoBuoiError || error instanceof TrungPhongHocError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayKhoaError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { doiLichBuoiHoc } from "@/server/services/gd/gd-03-doi-lich";
import { ThieuLyDoThayDoiError } from "@/server/services/gd/loi-giang-day";
import { KhongTimThayBuoiHocError, TrungLichGiangVienTheoBuoiError, TrungPhongHocError } from "@/server/services/kh/loi-khoa";

type Params = { params: Promise<{ id: string }> };

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("GD-03");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(
      await doiLichBuoiHoc(id, {
        hocPhanId: body.hocPhanId ?? null,
        ngayHoc: body.ngayHoc,
        gioBatDau: body.gioBatDau ?? null,
        gioKetThuc: body.gioKetThuc ?? null,
        phongHocId: body.phongHocId ?? null,
        lyDo: body.lyDo,
      }),
    );
  } catch (error) {
    if (
      error instanceof ThieuLyDoThayDoiError ||
      error instanceof TrungLichGiangVienTheoBuoiError ||
      error instanceof TrungPhongHocError
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayBuoiHocError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

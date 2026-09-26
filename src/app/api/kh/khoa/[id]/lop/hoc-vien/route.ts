import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { hocVienTheoLop, xepLopNhieu } from "@/server/services/kh/kh-07-lop-hoc";
import { phanHoiLoiLop } from "@/app/api/kh/_phan-hoi-loi-lop";

type Params = { params: Promise<{ id: string }> };

// KH-07: học viên chính thức theo lớp, lọc ?q=&dvct=&dvlk=&lop= (lop=chua-xep: chưa có lớp)
export const GET = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("KH-07");
  const { id } = await params;
  const url = new URL(req.url);
  return NextResponse.json(
    await hocVienTheoLop(id, {
      tuKhoa: url.searchParams.get("q"),
      donViCongTac: url.searchParams.get("dvct"),
      donViLienKetId: url.searchParams.get("dvlk"),
      lopId: url.searchParams.get("lop"),
    }),
  );
});

// KH-07: xếp/chuyển nhiều học viên vào cùng 1 lớp
export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("KH-07");
  const { id } = await params;
  const body = await req.json();
  try {
    return NextResponse.json(
      await xepLopNhieu(id, Array.isArray(body.dangKyIds) ? body.dangKyIds.map(String) : [], {
        lopId: String(body.lopId ?? ""),
        lyDo: body.lyDo ?? null,
        ngayHieuLuc: body.ngayHieuLuc ?? null,
        nguoiThucHienId: phien.userId,
        nguoiThucHienTen: phien.hoTen,
      }),
    );
  } catch (error) {
    return phanHoiLoiLop(error);
  }
});

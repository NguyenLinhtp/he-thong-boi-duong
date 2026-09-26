import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { xepLop } from "@/server/services/kh/kh-07-lop-hoc";
import { phanHoiLoiLop } from "@/app/api/kh/_phan-hoi-loi-lop";

type Params = { params: Promise<{ id: string }> };

// KH-07: xếp lớp lần đầu hoặc chuyển lớp trong cùng khóa (id = đăng ký học).
export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("KH-07");
  const { id } = await params;
  const body = await req.json();
  try {
    return NextResponse.json(
      await xepLop(id, {
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

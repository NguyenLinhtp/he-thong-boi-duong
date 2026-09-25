import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { boQuaDieuKienHocPhi } from "@/server/services/hp/hp-06-dieu-kien";
import { KhongTimThayHocPhiError, ThieuLyDoBoQuaError } from "@/server/services/hp/loi-hoc-phi";

type Params = { params: Promise<{ id: string }> };

// HP-06: gán quyền theo HP-01 - xem ghi chú trong actions.ts của trang
// /khoa-hoc/[id]/hoc-phi (actor gốc "Hệ thống (tự động kiểm tra)" không map
// sang vai trò người dùng cụ thể nào).
export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("HP-01");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(
      await boQuaDieuKienHocPhi(id, {
        lyDo: body.lyDo,
        nguoiPheDuyetId: phien.userId,
        nguoiPheDuyetTen: phien.hoTen,
      }),
    );
  } catch (error) {
    if (error instanceof ThieuLyDoBoQuaError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayHocPhiError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

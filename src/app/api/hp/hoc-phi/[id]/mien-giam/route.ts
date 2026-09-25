import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { xacNhanMienGiam } from "@/server/services/hp/hp-02-thanh-toan";
import { KhongTimThayHocPhiError, HocPhiQuaDonViLienKetError } from "@/server/services/hp/loi-hoc-phi";

type Params = { params: Promise<{ id: string }> };

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("HP-02");
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    return NextResponse.json(
      await xacNhanMienGiam(id, {
        lyDo: body.lyDo ?? "Miễn giảm theo chính sách khóa",
        nguoiXacNhanId: phien.userId,
        nguoiXacNhanTen: phien.hoTen,
      }),
    );
  } catch (error) {
    if (error instanceof HocPhiQuaDonViLienKetError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayHocPhiError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

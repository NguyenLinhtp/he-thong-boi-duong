import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { xacNhanThanhToan } from "@/server/services/hp/hp-02-thanh-toan";
import {
  KhongTimThayHocPhiError,
  SoTienKhongHopLeError,
  HocPhiQuaDonViLienKetError,
} from "@/server/services/hp/loi-hoc-phi";

type Params = { params: Promise<{ id: string }> };

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("HP-02");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(
      await xacNhanThanhToan(id, {
        soTien: body.soTien,
        hinhThucNop: body.hinhThucNop,
        nguoiXacNhanId: phien.userId,
        nguoiXacNhanTen: phien.hoTen,
      }),
    );
  } catch (error) {
    if (error instanceof SoTienKhongHopLeError || error instanceof HocPhiQuaDonViLienKetError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayHocPhiError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

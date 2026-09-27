import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { ghiNhanThoiHoc } from "@/server/services/hv/hv-09-quan-ly-danh-sach-khoa";
import { KhongTimThayDangKyError } from "@/server/services/hv/loi-hoc-vien";

type Params = { params: Promise<{ id: string }> };

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("HV-09");
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    return NextResponse.json(await ghiNhanThoiHoc(id, body.lyDo ?? null, { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen }));
  } catch (error) {
    if (error instanceof KhongTimThayDangKyError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

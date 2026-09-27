import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { xoaHocVienKhoiKhoa } from "@/server/services/hv/hv-09-quan-ly-danh-sach-khoa";
import {
  KhongTimThayDangKyError,
  KhongTheXoaHocVienCoKetQuaError,
  DaNopHocPhiKhoaNayError,
  HoSoQuaDonViLienKetError,
} from "@/server/services/hv/loi-hoc-vien";

type Params = { params: Promise<{ id: string }> };

export const DELETE = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("HV-09");
  const { id } = await params;

  try {
    await xoaHocVienKhoiKhoa(id, new URL(req.url).searchParams.get("lyDo"), { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof KhongTheXoaHocVienCoKetQuaError ||
      error instanceof DaNopHocPhiKhoaNayError ||
      error instanceof HoSoQuaDonViLienKetError
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayDangKyError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

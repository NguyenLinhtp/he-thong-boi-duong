import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { chuyenHocVienSangKhoa } from "@/server/services/hv/hv-09-quan-ly-danh-sach-khoa";
import {
  KhongTimThayKhoaError,
  KhongTimThayDangKyError,
  KhongTheXoaHocVienCoKetQuaError,
  DaDangKyKhoaNayError,
  DaNopHocPhiKhoaNayError,
  KhoaDichKhongNhanHocVienError,
  HoSoQuaDonViLienKetError,
} from "@/server/services/hv/loi-hoc-vien";

type Params = { params: Promise<{ id: string }> };

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("HV-09");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(await chuyenHocVienSangKhoa(id, body.khoaMoiId, body.lyDo ?? null, { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen }));
  } catch (error) {
    if (
      error instanceof KhongTheXoaHocVienCoKetQuaError ||
      error instanceof DaDangKyKhoaNayError ||
      error instanceof DaNopHocPhiKhoaNayError ||
      error instanceof KhoaDichKhongNhanHocVienError ||
      error instanceof HoSoQuaDonViLienKetError
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayDangKyError || error instanceof KhongTimThayKhoaError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

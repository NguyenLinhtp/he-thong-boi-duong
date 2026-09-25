import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/auth/guard";
import { xacNhanThamGia } from "@/server/services/hv/hv-04-tu-xac-nhan";
import {
  KhongTimThayKhoaError,
  KhongKhopDuLieuImportError,
  DaXacNhanThamGiaError,
  KhoaChuaMoXacNhanThamGiaError,
} from "@/server/services/hv/loi-hoc-vien";

// HV-04: điểm xác nhận công khai (actor "Học viên" tự xác nhận, không cần
// tài khoản nội bộ) - không gọi requirePermission như các route nội bộ khác.
export const POST = apiRoute(async (req: Request) => {
  const body = await req.json();

  try {
    return NextResponse.json(
      await xacNhanThamGia({
        khoaId: body.khoaId,
        soCCCD: body.soCCCD,
        soDienThoai: body.soDienThoai ?? null,
        email: body.email ?? null,
        ngaySinh: body.ngaySinh ?? null,
      }),
    );
  } catch (error) {
    if (
      error instanceof KhongKhopDuLieuImportError ||
      error instanceof DaXacNhanThamGiaError ||
      error instanceof KhoaChuaMoXacNhanThamGiaError
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayKhoaError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

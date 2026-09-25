import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/auth/guard";
import { dangKyTrucTuyen } from "@/server/services/hv/hv-01-dang-ky-truc-tuyen";
import {
  KhongTimThayKhoaError,
  SaiPhuongThucDangKyError,
  KhoaKhongMoDangKyError,
  DaDangKyKhoaNayError,
} from "@/server/services/hv/loi-hoc-vien";

// HV-01: điểm đăng ký công khai (actor "Học viên" chưa có tài khoản trong hệ
// thống) - không gọi requirePermission như các route nội bộ khác.
export const POST = apiRoute(async (req: Request) => {
  const body = await req.json();

  try {
    return NextResponse.json(
      await dangKyTrucTuyen({
        khoaId: body.khoaId,
        hoTen: body.hoTen,
        soCCCD: body.soCCCD,
        ngaySinh: body.ngaySinh ?? null,
        soDienThoai: body.soDienThoai ?? null,
        email: body.email ?? null,
        donViCongTac: body.donViCongTac ?? null,
      }),
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof SaiPhuongThucDangKyError ||
      error instanceof KhoaKhongMoDangKyError ||
      error instanceof DaDangKyKhoaNayError
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayKhoaError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

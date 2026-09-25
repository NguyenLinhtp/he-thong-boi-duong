import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/auth/guard";
import { dangKyQuaDonViLienKet } from "@/server/services/hv/hv-12-dang-ky-qua-dvlk";
import {
  KhongTimThayKhoaError,
  SaiPhuongThucDangKyError,
  KhoaKhongMoDangKyError,
  DaDangKyKhoaNayError,
  DonViLienKetKhongHopLeChoKhoaError,
} from "@/server/services/hv/loi-hoc-vien";

// HV-12 (Phương thức 4b): điểm đăng ký công khai, giống HV-01 nhưng học
// viên tự chọn đơn vị liên kết thu hồ sơ.
export const POST = apiRoute(async (req: Request) => {
  const body = await req.json();

  try {
    return NextResponse.json(
      await dangKyQuaDonViLienKet({
        khoaId: body.khoaId,
        donViLienKetId: body.donViLienKetId,
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
      error instanceof DaDangKyKhoaNayError ||
      error instanceof DonViLienKetKhongHopLeChoKhoaError
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayKhoaError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

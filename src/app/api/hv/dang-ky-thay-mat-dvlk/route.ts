import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { dangKyThayMatDonViLienKet } from "@/server/services/hv/hv-11-dang-ky-thay-mat-dvlk";
import {
  KhongTimThayKhoaError,
  SaiPhuongThucDangKyError,
  KhoaKhongMoDangKyError,
  DaDangKyKhoaNayError,
  KhongPhaiTaiKhoanDonViLienKetError,
  KhongCoHopDongLienKetHieuLucError,
} from "@/server/services/hv/loi-hoc-vien";

// HV-11 (Phương thức 4a): cán bộ đơn vị liên kết đăng ký thay mặt - cần
// đăng nhập (khác HV-01/HV-12 công khai).
export const POST = apiRoute(async (req: Request) => {
  const phien = await requirePermission("HV-11");
  const body = await req.json();

  try {
    return NextResponse.json(
      await dangKyThayMatDonViLienKet(phien.userId, {
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
      error instanceof DaDangKyKhoaNayError ||
      error instanceof KhongPhaiTaiKhoanDonViLienKetError ||
      error instanceof KhongCoHopDongLienKetHieuLucError
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayKhoaError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

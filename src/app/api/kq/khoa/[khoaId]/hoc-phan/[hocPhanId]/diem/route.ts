import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { giangVienCuaTaiKhoan } from "@/server/services/gd/dung-chung";
import { KhongPhaiTaiKhoanGiangVienError } from "@/server/services/gd/loi-giang-day";
import { bangDiemHocPhan, nhapDiemHocPhan } from "@/server/services/kq/kq-01-nhap-diem";
import { phanHoiLoiKetQua } from "@/app/api/kq/_phan-hoi-loi";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

type Params = { params: Promise<{ khoaId: string; hocPhanId: string }> };

async function giangVienDangNhap(nguoiDungId: string) {
  const giangVien = await giangVienCuaTaiKhoan(nguoiDungId);
  if (!giangVien) throw new KhongPhaiTaiKhoanGiangVienError();
  return giangVien;
}

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  const phien = await requirePermission("KQ-01");
  const { khoaId, hocPhanId } = await params;
  try {
    const giangVien = await giangVienDangNhap(phien.userId);
    return NextResponse.json(await bangDiemHocPhan(giangVien.id, khoaId, hocPhanId));
  } catch (error) {
    return phanHoiLoiKetQua(error);
  }
});

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("KQ-01");
  const { khoaId, hocPhanId } = await params;
  const body = await req.json();
  try {
    const giangVien = await giangVienDangNhap(phien.userId);
    return NextResponse.json(await nhapDiemHocPhan(giangVien.id, khoaId, hocPhanId, body.danhSach, nguoiTuPhien(phien)));
  } catch (error) {
    return phanHoiLoiKetQua(error);
  }
});

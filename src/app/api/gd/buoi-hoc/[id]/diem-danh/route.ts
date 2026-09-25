import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { giangVienCuaTaiKhoan } from "@/server/services/gd/dung-chung";
import { dsHocVienDeDiemDanh, diemDanhBuoiHoc } from "@/server/services/gd/gd-01-diem-danh";
import { KhongPhaiTaiKhoanGiangVienError, KhongDuocPhanCongBuoiHocError } from "@/server/services/gd/loi-giang-day";
import { KhongTimThayBuoiHocError } from "@/server/services/kh/loi-khoa";

type Params = { params: Promise<{ id: string }> };

async function giangVienDangNhap(nguoiDungId: string) {
  const giangVien = await giangVienCuaTaiKhoan(nguoiDungId);
  if (!giangVien) throw new KhongPhaiTaiKhoanGiangVienError();
  return giangVien;
}

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  const phien = await requirePermission("GD-01");
  const { id } = await params;

  try {
    const giangVien = await giangVienDangNhap(phien.userId);
    return NextResponse.json(await dsHocVienDeDiemDanh(giangVien.id, id));
  } catch (error) {
    if (error instanceof KhongDuocPhanCongBuoiHocError || error instanceof KhongPhaiTaiKhoanGiangVienError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error instanceof KhongTimThayBuoiHocError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("GD-01");
  const { id } = await params;
  const body = await req.json();

  try {
    const giangVien = await giangVienDangNhap(phien.userId);
    return NextResponse.json(await diemDanhBuoiHoc(giangVien.id, id, body.danhSach));
  } catch (error) {
    if (error instanceof KhongDuocPhanCongBuoiHocError || error instanceof KhongPhaiTaiKhoanGiangVienError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error instanceof KhongTimThayBuoiHocError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

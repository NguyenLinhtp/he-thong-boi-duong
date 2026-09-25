import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { giangVienCuaTaiKhoan } from "@/server/services/gd/dung-chung";
import { ghiNhatKyBuoiHoc } from "@/server/services/gd/gd-02-nhat-ky";
import { KhongPhaiTaiKhoanGiangVienError, KhongDuocPhanCongBuoiHocError } from "@/server/services/gd/loi-giang-day";
import { KhongTimThayBuoiHocError } from "@/server/services/kh/loi-khoa";

type Params = { params: Promise<{ id: string }> };

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("GD-02");
  const { id } = await params;
  const body = await req.json();

  try {
    const giangVien = await giangVienCuaTaiKhoan(phien.userId);
    if (!giangVien) throw new KhongPhaiTaiKhoanGiangVienError();
    return NextResponse.json(
      await ghiNhatKyBuoiHoc(giangVien.id, id, {
        noiDungDaGiang: body.noiDungDaGiang ?? null,
        nhanXet: body.nhanXet ?? null,
      }),
    );
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

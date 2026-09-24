import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { danhSachPhanCong, phanCongGiangVien } from "@/server/services/kh/kh-02-phan-cong-giang-vien";
import {
  KhongTimThayKhoaError,
  KhongTimThayGiangVienError,
  HocPhanKhongThuocChuongTrinhError,
  TrungLichGiangVienError,
} from "@/server/services/kh/loi-khoa";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("KH-02");
  const { id } = await params;
  return NextResponse.json(await danhSachPhanCong(id));
});

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("KH-02");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(
      await phanCongGiangVien({ khoaId: id, hocPhanId: body.hocPhanId, giangVienId: body.giangVienId }),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof TrungLichGiangVienError || error instanceof HocPhanKhongThuocChuongTrinhError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayKhoaError || error instanceof KhongTimThayGiangVienError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

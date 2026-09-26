import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { doiChieuThanhLy, thanhLyHopDong } from "@/server/services/dvlk/dvlk-06-thanh-ly";
import { phanHoiLoiDvlk } from "@/app/api/dvlk/_phan-hoi-loi";

type Params = { params: Promise<{ id: string }> };

// DVLK-06 bước 1: đối chiếu số học viên hoàn thành/thôi học với hợp đồng
export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("DVLK-06");
  const { id } = await params;
  try {
    return NextResponse.json(await doiChieuThanhLy(id));
  } catch (error) {
    return phanHoiLoiDvlk(error);
  }
});

// DVLK-06 bước 2: thanh lý (body.soTienQuyetToan bắt buộc; ngayThanhLy, ghiChu tùy chọn)
export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("DVLK-06");
  const { id } = await params;
  const body = await req.json();
  try {
    return NextResponse.json(
      await thanhLyHopDong(id, {
        soTienQuyetToan: typeof body.soTienQuyetToan === "number" ? body.soTienQuyetToan : null,
        ngayThanhLy: body.ngayThanhLy ?? null,
        ghiChu: body.ghiChu ?? null,
        nguoiThucHienId: phien.userId,
        nguoiThucHienTen: phien.hoTen,
      }),
    );
  } catch (error) {
    return phanHoiLoiDvlk(error);
  }
});

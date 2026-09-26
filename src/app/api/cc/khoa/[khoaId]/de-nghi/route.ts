import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { xetDeNghiCapChungChi, lapDanhSachDeNghi } from "@/server/services/cc/cc-01-de-nghi";
import { phanHoiLoiChungChi } from "@/app/api/cc/_phan-hoi-loi";

type Params = { params: Promise<{ khoaId: string }> };

// CC-01: xem trước danh sách đủ/không đủ điều kiện
export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("CC-01");
  const { khoaId } = await params;
  try {
    return NextResponse.json(await xetDeNghiCapChungChi(khoaId));
  } catch (error) {
    return phanHoiLoiChungChi(error);
  }
});

// CC-01: lập danh sách đề nghị (tạo chứng chỉ trạng thái Đề nghị)
export const POST = apiRoute(async (_req: Request, { params }: Params) => {
  const phien = await requirePermission("CC-01");
  const { khoaId } = await params;
  try {
    return NextResponse.json(
      await lapDanhSachDeNghi(khoaId, { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen }),
      { status: 201 },
    );
  } catch (error) {
    return phanHoiLoiChungChi(error);
  }
});

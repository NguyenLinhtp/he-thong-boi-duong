import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { layHopDong, capNhatHopDong } from "@/server/services/dvlk/dvlk-03-hop-dong";
import { phanHoiLoiDvlk } from "@/app/api/dvlk/_phan-hoi-loi";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("DVLK-03");
  const { id } = await params;
  try {
    return NextResponse.json(await layHopDong(id));
  } catch (error) {
    return phanHoiLoiDvlk(error);
  }
});

// DVLK-03: sửa số lượng dự kiến / đơn giá / ghi chú khi chưa thanh lý
export const PATCH = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("DVLK-03");
  const { id } = await params;
  const body = await req.json();
  try {
    return NextResponse.json(
      await capNhatHopDong(
        id,
        { soLuongDuKien: body.soLuongDuKien ?? null, donGiaThoaThuan: body.donGiaThoaThuan ?? null, ghiChu: body.ghiChu ?? null },
        { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen },
      ),
    );
  } catch (error) {
    return phanHoiLoiDvlk(error);
  }
});

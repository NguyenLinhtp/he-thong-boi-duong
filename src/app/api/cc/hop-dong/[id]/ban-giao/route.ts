import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { banGiaoTheoLo } from "@/server/services/cc/cc-04-so-cap";
import { phanHoiLoiChungChi } from "@/app/api/cc/_phan-hoi-loi";

type Params = { params: Promise<{ id: string }> };

// CC-04: bàn giao theo lô về đơn vị liên kết (id = hợp đồng liên kết, phải đã thanh lý)
export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("CC-04");
  const { id } = await params;
  const body = await req.json();
  try {
    return NextResponse.json(
      await banGiaoTheoLo(id, {
        nguoiDaiDienNhan: body.nguoiDaiDienNhan ? String(body.nguoiDaiDienNhan) : null,
        ngayBanGiao: body.ngayBanGiao ?? null,
        ghiChu: body.ghiChu ?? null,
        nguoiThucHienId: phien.userId,
        nguoiThucHienTen: phien.hoTen,
      }),
      { status: 201 },
    );
  } catch (error) {
    return phanHoiLoiChungChi(error);
  }
});

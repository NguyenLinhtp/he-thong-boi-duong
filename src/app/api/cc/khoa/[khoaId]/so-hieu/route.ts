import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { sinhSoHieu } from "@/server/services/cc/cc-02-so-hieu";
import { phanHoiLoiChungChi } from "@/app/api/cc/_phan-hoi-loi";

type Params = { params: Promise<{ khoaId: string }> };

// CC-02: sinh số hiệu cho chứng chỉ Đề nghị của khóa (body.chungChiIds tùy chọn: chỉ 1 phần)
export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("CC-02");
  const { khoaId } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    return NextResponse.json(
      await sinhSoHieu(
        khoaId,
        { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen },
        Array.isArray(body.chungChiIds) ? body.chungChiIds.map(String) : undefined,
      ),
    );
  } catch (error) {
    return phanHoiLoiChungChi(error);
  }
});

import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { kyDuyetChungChi } from "@/server/services/cc/cc-03-ky-duyet";
import { phanHoiLoiChungChi } from "@/app/api/cc/_phan-hoi-loi";

type Params = { params: Promise<{ khoaId: string }> };

// CC-03: nhập quyết định cấp văn bằng theo khóa hoặc lớp (body.lopId tùy chọn; body.chungChiIds
// tùy chọn - bỏ trống = mọi văn bằng Đề nghị/Chờ ký duyệt trong phạm vi)
export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("CC-03");
  const { khoaId } = await params;
  const body = await req.json();
  try {
    return NextResponse.json(
      await kyDuyetChungChi(khoaId, {
        soQuyetDinh: String(body.soQuyetDinh ?? ""),
        ngayKy: String(body.ngayKy ?? ""),
        nguoiKy: String(body.nguoiKy ?? ""),
        lopId: body.lopId ? String(body.lopId) : null,
        chungChiIds: Array.isArray(body.chungChiIds) ? body.chungChiIds.map(String) : undefined,
        nguoiThucHienId: phien.userId,
        nguoiThucHienTen: phien.hoTen,
      }),
    );
  } catch (error) {
    return phanHoiLoiChungChi(error);
  }
});

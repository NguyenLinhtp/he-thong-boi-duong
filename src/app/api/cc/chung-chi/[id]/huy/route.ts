import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { huyChungChi } from "@/server/services/cc/cc-02-so-hieu";
import { phanHoiLoiChungChi } from "@/app/api/cc/_phan-hoi-loi";

type Params = { params: Promise<{ id: string }> };

// CC-02: hủy chứng chỉ chưa cấp - số hiệu (nếu có) giữ lại, không cấp lại
export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("CC-02");
  const { id } = await params;
  const body = await req.json();
  try {
    return NextResponse.json(
      await huyChungChi(id, String(body.lyDo ?? ""), { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen }),
    );
  } catch (error) {
    return phanHoiLoiChungChi(error);
  }
});

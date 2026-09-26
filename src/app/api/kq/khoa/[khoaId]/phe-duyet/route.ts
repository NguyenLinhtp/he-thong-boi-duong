import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { pheDuyetKetQua } from "@/server/services/kq/kq-04-phe-duyet";
import { phanHoiLoiKetQua } from "@/app/api/kq/_phan-hoi-loi";

type Params = { params: Promise<{ khoaId: string }> };

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("KQ-04");
  const { khoaId } = await params;
  const body = await req.json();
  try {
    return NextResponse.json(
      await pheDuyetKetQua(khoaId, {
        soQuyetDinh: String(body.soQuyetDinh ?? ""),
        nguoiThucHienId: phien.userId,
        nguoiThucHienTen: phien.hoTen,
      }),
    );
  } catch (error) {
    return phanHoiLoiKetQua(error);
  }
});

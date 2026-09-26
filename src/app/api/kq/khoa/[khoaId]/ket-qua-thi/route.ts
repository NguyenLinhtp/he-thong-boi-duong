import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { nhapKetQuaThi } from "@/server/services/kq/kq-06-ket-qua-thi";
import { phanHoiLoiKetQua } from "@/app/api/kq/_phan-hoi-loi";

type Params = { params: Promise<{ khoaId: string }> };

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("KQ-06");
  const { khoaId } = await params;
  const body = await req.json();
  try {
    return NextResponse.json(await nhapKetQuaThi(khoaId, body.danhSach));
  } catch (error) {
    return phanHoiLoiKetQua(error);
  }
});

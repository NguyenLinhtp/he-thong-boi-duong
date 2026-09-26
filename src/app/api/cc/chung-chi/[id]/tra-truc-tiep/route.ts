import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { traTrucTiep } from "@/server/services/cc/cc-04-so-cap";
import { phanHoiLoiChungChi } from "@/app/api/cc/_phan-hoi-loi";

type Params = { params: Promise<{ id: string }> };

// CC-04: vào sổ + trao trực tiếp cho học viên tự đăng ký
export const POST = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("CC-04");
  const { id } = await params;
  const body = await req.json();
  try {
    return NextResponse.json(
      await traTrucTiep(id, {
        nguoiNhan: String(body.nguoiNhan ?? ""),
        ngayNhan: body.ngayNhan ?? null,
        nguoiThucHienId: phien.userId,
        nguoiThucHienTen: phien.hoTen,
      }),
    );
  } catch (error) {
    return phanHoiLoiChungChi(error);
  }
});

import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { chiaLopTuDong } from "@/server/services/kh/kh-07-lop-hoc";
import { phanHoiLoiLop } from "@/app/api/kh/_phan-hoi-loi-lop";

type Params = { params: Promise<{ id: string }> };

export const POST = apiRoute(async (_req: Request, { params }: Params) => {
  const phien = await requirePermission("KH-07");
  const { id } = await params;
  try {
    return NextResponse.json(
      await chiaLopTuDong(id, { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen }),
    );
  } catch (error) {
    return phanHoiLoiLop(error);
  }
});

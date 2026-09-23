import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { MaTrungError } from "@/server/services/shared/loi-danh-muc";
import {
  danhSachLoaiHinhBoiDuong,
  taoLoaiHinhBoiDuong,
} from "@/server/services/dm/dm-03-loai-hinh-boi-duong";

export const GET = apiRoute(async () => {
  await requirePermission("DM-03");
  return NextResponse.json(await danhSachLoaiHinhBoiDuong());
});

export const POST = apiRoute(async (req: Request) => {
  await requirePermission("DM-03");
  const body = await req.json();

  try {
    return NextResponse.json(await taoLoaiHinhBoiDuong(body), { status: 201 });
  } catch (error) {
    if (error instanceof MaTrungError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

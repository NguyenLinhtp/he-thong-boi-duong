import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import {
  layDonViLienKet,
  capNhatDonViLienKet,
  doiTrangThaiHopTac,
  xoaDonViLienKet,
} from "@/server/services/dvlk/dvlk-01-danh-muc";
import { phanHoiLoiDvlk } from "@/app/api/dvlk/_phan-hoi-loi";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("DVLK-01");
  const { id } = await params;
  try {
    return NextResponse.json(await layDonViLienKet(id));
  } catch (error) {
    return phanHoiLoiDvlk(error);
  }
});

// DVLK-01: sửa thông tin; body.trangThaiHopTac (nếu có) đổi trạng thái hợp tác
export const PATCH = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("DVLK-01");
  const { id } = await params;
  const body = await req.json();
  const nguoi = { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen };
  try {
    if (body.trangThaiHopTac === "DANG_HOP_TAC" || body.trangThaiHopTac === "TAM_NGUNG") {
      return NextResponse.json(await doiTrangThaiHopTac(id, body.trangThaiHopTac, nguoi));
    }
    return NextResponse.json(await capNhatDonViLienKet(id, body, nguoi));
  } catch (error) {
    return phanHoiLoiDvlk(error);
  }
});

export const DELETE = apiRoute(async (_req: Request, { params }: Params) => {
  const phien = await requirePermission("DVLK-01");
  const { id } = await params;
  try {
    await xoaDonViLienKet(id, { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen });
    return new Response(null, { status: 204 });
  } catch (error) {
    return phanHoiLoiDvlk(error);
  }
});

import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { layHoSoHocVien, capNhatHoSoHocVien, phamViHoSoHocVien } from "@/server/services/hv/hv-08-ho-so-hoc-vien";
import { KhongTimThayHocVienError, CccdTrungError, NgoaiPhamViHoSoHocVienError } from "@/server/services/hv/loi-hoc-vien";

type Params = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  const phien = await requirePermission("HV-08");
  const { id } = await params;

  try {
    return NextResponse.json(await layHoSoHocVien(id, await phamViHoSoHocVien(phien.userId)));
  } catch (error) {
    if (error instanceof NgoaiPhamViHoSoHocVienError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error instanceof KhongTimThayHocVienError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

export const PATCH = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("HV-08");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(await capNhatHoSoHocVien(id, body, await phamViHoSoHocVien(phien.userId)));
  } catch (error) {
    if (error instanceof NgoaiPhamViHoSoHocVienError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error instanceof CccdTrungError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof KhongTimThayHocVienError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

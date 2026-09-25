import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import {
  danhSachDonViLienKet,
  taoDonViLienKet,
  MaDonViLienKetTrungError,
} from "@/server/services/hv/lien-ket-ho-tro";

// Thiết lập tối thiểu cho HV-11/HV-12 (xem ghi chú lien-ket-ho-tro.ts) - gate
// tạm qua QT-01, chưa phải route chính thức của module DVLK.
export const GET = apiRoute(async () => {
  await requirePermission("QT-01");
  return NextResponse.json(await danhSachDonViLienKet());
});

export const POST = apiRoute(async (req: Request) => {
  await requirePermission("QT-01");
  const body = await req.json();

  try {
    return NextResponse.json(await taoDonViLienKet(body), { status: 201 });
  } catch (error) {
    if (error instanceof MaDonViLienKetTrungError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

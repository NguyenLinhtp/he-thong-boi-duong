import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { danhSachDonViLienKet, taoDonViLienKet } from "@/server/services/dvlk/dvlk-01-danh-muc";
import { phanHoiLoiDvlk } from "@/app/api/dvlk/_phan-hoi-loi";

// DVLK-01: tra cứu (?q=&trangThai=DANG_HOP_TAC|TAM_NGUNG) và thêm đơn vị liên kết
export const GET = apiRoute(async (req: Request) => {
  await requirePermission("DVLK-01");
  const url = new URL(req.url);
  const trangThai = url.searchParams.get("trangThai");
  return NextResponse.json(
    await danhSachDonViLienKet({
      tuKhoa: url.searchParams.get("q"),
      trangThaiHopTac: trangThai === "DANG_HOP_TAC" || trangThai === "TAM_NGUNG" ? trangThai : null,
    }),
  );
});

export const POST = apiRoute(async (req: Request) => {
  const phien = await requirePermission("DVLK-01");
  const body = await req.json();
  try {
    return NextResponse.json(
      await taoDonViLienKet(body, { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen }),
      { status: 201 },
    );
  } catch (error) {
    return phanHoiLoiDvlk(error);
  }
});

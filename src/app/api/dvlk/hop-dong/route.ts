import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { danhSachHopDong, taoHopDong } from "@/server/services/dvlk/dvlk-03-hop-dong";
import { phanHoiLoiDvlk } from "@/app/api/dvlk/_phan-hoi-loi";

// DVLK-03: theo dõi hợp đồng (?khoa=&donVi=&trangThai=&q=) và lập hợp đồng mới
export const GET = apiRoute(async (req: Request) => {
  await requirePermission("DVLK-03");
  const url = new URL(req.url);
  const trangThai = url.searchParams.get("trangThai");
  return NextResponse.json(
    await danhSachHopDong({
      khoaId: url.searchParams.get("khoa"),
      donViLienKetId: url.searchParams.get("donVi"),
      tuKhoa: url.searchParams.get("q"),
      trangThai: trangThai === "DANG_TRIEN_KHAI" || trangThai === "DA_THANH_LY" ? trangThai : null,
    }),
  );
});

export const POST = apiRoute(async (req: Request) => {
  const phien = await requirePermission("DVLK-03");
  const body = await req.json();
  try {
    return NextResponse.json(
      await taoHopDong(
        {
          donViLienKetId: String(body.donViLienKetId ?? ""),
          khoaId: String(body.khoaId ?? ""),
          soLuongDuKien: body.soLuongDuKien ?? null,
          donGiaThoaThuan: body.donGiaThoaThuan ?? null,
          ghiChu: body.ghiChu ?? null,
        },
        { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen },
      ),
      { status: 201 },
    );
  } catch (error) {
    return phanHoiLoiDvlk(error);
  }
});

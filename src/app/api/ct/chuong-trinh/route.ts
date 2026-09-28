import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { taoChuongTrinh } from "@/server/services/ct/ct-01-tao-chuong-trinh";
import {
  timKiemChuongTrinh,
  type TimKiemChuongTrinhFilter,
} from "@/server/services/ct/ct-05-tra-cuu";
import type { TrangThaiChuongTrinh } from "@/generated/prisma/client";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

export const GET = apiRoute(async (req: Request) => {
  await requirePermission("CT-05");
  const url = new URL(req.url);
  const filter: TimKiemChuongTrinhFilter = {
    ten: url.searchParams.get("ten") ?? undefined,
    maCT: url.searchParams.get("maCT") ?? undefined,
    loaiHinhBoiDuongId: url.searchParams.get("loaiHinhBoiDuongId") ?? undefined,
    trangThai: (url.searchParams.get("trangThai") as TrangThaiChuongTrinh | null) ?? undefined,
  };
  return NextResponse.json(await timKiemChuongTrinh(filter));
});

export const POST = apiRoute(async (req: Request) => {
  const phien = await requirePermission("CT-01");
  const body = await req.json();
  return NextResponse.json(await taoChuongTrinh(body, nguoiTuPhien(phien)), { status: 201 });
});

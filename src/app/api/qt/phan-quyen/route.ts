import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { layMaTranPhanQuyen, capNhatQuyen } from "@/server/services/qt/qt-02-phan-quyen";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";

export const GET = apiRoute(async () => {
  await requirePermission("QT-02");
  return NextResponse.json(await layMaTranPhanQuyen());
});

export const PATCH = apiRoute(async (req: Request) => {
  const phien = await requirePermission("QT-02");
  const { vaiTro, maCN, coQuyen } = await req.json();
  await capNhatQuyen(vaiTro, maCN, coQuyen, nguoiTuPhien(phien));
  return NextResponse.json({ ok: true });
});

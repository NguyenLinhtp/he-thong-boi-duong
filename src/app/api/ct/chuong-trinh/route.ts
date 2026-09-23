import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { danhSachChuongTrinh, taoChuongTrinh } from "@/server/services/ct/ct-01-tao-chuong-trinh";

export const GET = apiRoute(async () => {
  await requirePermission("CT-01");
  return NextResponse.json(await danhSachChuongTrinh());
});

export const POST = apiRoute(async (req: Request) => {
  await requirePermission("CT-01");
  const body = await req.json();
  return NextResponse.json(await taoChuongTrinh(body), { status: 201 });
});

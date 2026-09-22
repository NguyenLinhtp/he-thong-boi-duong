import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import {
  khoaTaiKhoan,
  moKhoaTaiKhoan,
  datLaiMatKhau,
  ganVaiTro,
  xoaTaiKhoan,
  MatKhauYeuError,
} from "@/server/services/qt/qt-01-quan-ly-tai-khoan";

type Params = { params: Promise<{ id: string }> };

export const PATCH = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("QT-01");
  const { id } = await params;
  const body = await req.json();

  try {
    switch (body.hanhDong) {
      case "khoa":
        return NextResponse.json(await khoaTaiKhoan(id));
      case "mo_khoa":
        return NextResponse.json(await moKhoaTaiKhoan(id));
      case "dat_lai_mat_khau":
        return NextResponse.json(await datLaiMatKhau(id, body.matKhauMoi));
      case "gan_vai_tro":
        await ganVaiTro(id, body.vaiTros);
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ message: "Hành động không hợp lệ" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof MatKhauYeuError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

export const DELETE = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("QT-01");
  const { id } = await params;
  await xoaTaiKhoan(id);
  return NextResponse.json({ ok: true });
});

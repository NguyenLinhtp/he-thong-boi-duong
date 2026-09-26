import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { baoCaoDoanhThu, baoCaoCongNo } from "@/server/services/hp/hp-05-bao-cao";
import { khoangNgay } from "@/server/services/bc/khoang-ngay";
import { LoiBaoCao } from "@/server/services/bc/loi-bao-cao";

export const GET = apiRoute(async (req: Request) => {
  await requirePermission("HP-05");
  const { searchParams } = new URL(req.url);
  const khoaId = searchParams.get("khoaId") ?? undefined;
  let ky;
  try {
    // "đến ngày" tính hết ngày đó
    ky = khoangNgay(searchParams.get("tuNgay"), searchParams.get("denNgay"));
  } catch (error) {
    if (error instanceof LoiBaoCao) return NextResponse.json({ message: error.message }, { status: 400 });
    throw error;
  }

  const [doanhThu, congNo] = await Promise.all([
    baoCaoDoanhThu({ tuNgay: ky.tu, denNgay: ky.den, khoaId }),
    baoCaoCongNo({ khoaId }),
  ]);

  return NextResponse.json({ doanhThu, congNo });
});

import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { baoCaoDoanhThu, baoCaoCongNo } from "@/server/services/hp/hp-05-bao-cao";

export const GET = apiRoute(async (req: Request) => {
  await requirePermission("HP-05");
  const { searchParams } = new URL(req.url);
  const tuNgay = searchParams.get("tuNgay");
  const denNgay = searchParams.get("denNgay");
  const khoaId = searchParams.get("khoaId") ?? undefined;

  const [doanhThu, congNo] = await Promise.all([
    baoCaoDoanhThu({
      tuNgay: tuNgay ? new Date(tuNgay) : undefined,
      denNgay: denNgay ? new Date(denNgay) : undefined,
      khoaId,
    }),
    baoCaoCongNo({ khoaId }),
  ]);

  return NextResponse.json({ doanhThu, congNo });
});

import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { soCapChungChi } from "@/server/services/cc/cc-04-so-cap";

// CC-04: tra cứu sổ cấp chứng chỉ ?q=&khoaId=&nam=
export const GET = apiRoute(async (req: Request) => {
  await requirePermission("CC-04");
  const url = new URL(req.url);
  const nam = url.searchParams.get("nam");
  return NextResponse.json(
    await soCapChungChi({
      tuKhoa: url.searchParams.get("q"),
      khoaId: url.searchParams.get("khoaId"),
      nam: nam && /^\d{4}$/.test(nam) ? Number(nam) : null,
    }),
  );
});

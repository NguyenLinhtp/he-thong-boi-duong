import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { guiNhacNoHocPhi } from "@/server/services/hp/hp-03-cong-no";
import { KhongTimThayHocPhiError } from "@/server/services/hp/loi-hoc-phi";

type Params = { params: Promise<{ id: string }> };

export const POST = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("HP-03");
  const { id } = await params;

  try {
    return NextResponse.json(await guiNhacNoHocPhi(id));
  } catch (error) {
    if (error instanceof KhongTimThayHocPhiError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

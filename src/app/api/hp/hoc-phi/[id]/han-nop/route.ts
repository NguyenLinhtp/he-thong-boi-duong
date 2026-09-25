import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { datHanNop } from "@/server/services/hp/hp-03-cong-no";
import { KhongTimThayHocPhiError } from "@/server/services/hp/loi-hoc-phi";

type Params = { params: Promise<{ id: string }> };

export const POST = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("HP-03");
  const { id } = await params;
  const body = await req.json();

  try {
    return NextResponse.json(await datHanNop(id, new Date(body.hanNop)));
  } catch (error) {
    if (error instanceof KhongTimThayHocPhiError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
});

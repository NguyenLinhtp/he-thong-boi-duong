import { NextResponse } from "next/server";
import { xacThucTheoMa } from "@/server/services/cc/cc-05-xac-thuc";

// CC-05: xác thực công khai theo mã QR
export async function GET(_req: Request, { params }: { params: Promise<{ ma: string }> }) {
  const { ma } = await params;
  return NextResponse.json(await xacThucTheoMa(ma));
}

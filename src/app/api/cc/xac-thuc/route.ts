import { NextResponse } from "next/server";
import { traCuuTheoSoHieu } from "@/server/services/cc/cc-05-xac-thuc";

// CC-05: tra cứu công khai (không cần đăng nhập) - ?soHieu=&hoTen= (bắt buộc cả hai)
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  return NextResponse.json(await traCuuTheoSoHieu(q.get("soHieu") ?? "", q.get("hoTen") ?? ""));
}

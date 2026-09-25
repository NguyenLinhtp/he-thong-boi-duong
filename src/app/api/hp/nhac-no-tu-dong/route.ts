import { NextResponse } from "next/server";
import { chayNhacNoTuDong } from "@/server/services/hp/hp-03-cong-no";

// HP-03: "Tự động nhắc trước hạn chót tối thiểu 7 ngày" - giống cơ chế
// BACKUP_CRON_SECRET của QT-04, bộ lập lịch ngoài hệ thống gọi định kỳ (vd
// hằng ngày) route này để quét và gửi nhắc nợ, không dùng phiên đăng nhập.
export async function POST(req: Request) {
  const khoaBiMat = process.env.BACKUP_CRON_SECRET;
  const khoaGui = req.headers.get("x-backup-cron-secret");

  if (!khoaBiMat || khoaGui !== khoaBiMat) {
    return NextResponse.json({ message: "Không có quyền" }, { status: 401 });
  }

  const ketQua = await chayNhacNoTuDong();
  return NextResponse.json({ soLuongDaNhac: ketQua.length });
}

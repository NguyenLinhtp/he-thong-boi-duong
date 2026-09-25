import { NextResponse } from "next/server";
import { chayBackupNgay } from "@/server/services/qt/qt-04-sao-luu";

// QT-04: "Sao lưu tối thiểu hằng ngày" - route này không dùng phiên đăng
// nhập (bộ lập lịch bên ngoài hệ thống, ví dụ Windows Task Scheduler/cron,
// gọi định kỳ) mà xác thực bằng khóa bí mật chung BACKUP_CRON_SECRET. Chưa
// cấu hình biến này thì route luôn từ chối - không có mặc định "mở".
export async function POST(req: Request) {
  const khoaBiMat = process.env.BACKUP_CRON_SECRET;
  const khoaGui = req.headers.get("x-backup-cron-secret");

  if (!khoaBiMat || khoaGui !== khoaBiMat) {
    return NextResponse.json({ message: "Không có quyền" }, { status: 401 });
  }

  const ketQua = await chayBackupNgay(undefined, "TU_DONG");
  return NextResponse.json(ketQua, { status: 201 });
}

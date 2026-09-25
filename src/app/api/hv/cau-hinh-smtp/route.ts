import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import {
  layCauHinhSmtpHienThi,
  luuCauHinhSmtp,
  ThieuMatKhauSmtpError,
} from "@/server/services/hv/cau-hinh-smtp";
import { ThieuKhoaMaHoaError } from "@/lib/crypto/ma-hoa";

export const GET = apiRoute(async () => {
  await requirePermission("HV-10");
  return NextResponse.json(await layCauHinhSmtpHienThi());
});

export const POST = apiRoute(async (req: Request) => {
  await requirePermission("HV-10");
  const body = await req.json();

  try {
    const cauHinh = await luuCauHinhSmtp(body);
    return NextResponse.json({
      host: cauHinh.host,
      port: cauHinh.port,
      taiKhoan: cauHinh.taiKhoan,
      tuDiaChi: cauHinh.tuDiaChi,
      capNhatLuc: cauHinh.capNhatLuc,
    });
  } catch (error) {
    if (error instanceof ThieuKhoaMaHoaError || error instanceof ThieuMatKhauSmtpError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
});

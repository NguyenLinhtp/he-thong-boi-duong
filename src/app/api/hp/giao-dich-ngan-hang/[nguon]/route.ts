import { NextResponse } from "next/server";
import {
  docWebhookCasso,
  docWebhookSePay,
  WebhookKhongHopLeError,
  xacThucWebhook,
  xuLyGiaoDichDen,
} from "@/server/services/hp/hp-02-giao-dich-ngan-hang";

// (bổ sung 08/10/2026 - HP-02) webhook của dịch vụ theo dõi tài khoản nhận lệ phí: SePay gọi
// /api/hp/giao-dich-ngan-hang/sepay, Casso gọi /api/hp/giao-dich-ngan-hang/casso. Không dùng phiên
// đăng nhập (giống route nhắc nợ tự động HP-03) - xác thực bằng khóa NGAN_HANG_WEBHOOK_KEY.
type Params = { params: Promise<{ nguon: string }> };

export async function POST(req: Request, { params }: Params) {
  const ma = (await params).nguon.toLowerCase();
  const nguon = ma === "sepay" ? "SEPAY" : ma === "casso" ? "CASSO" : null;
  if (!nguon) return NextResponse.json({ success: false, message: "Nguồn không hỗ trợ" }, { status: 404 });
  if (!xacThucWebhook(nguon, req.headers)) {
    return NextResponse.json({ success: false, message: "Không có quyền" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Dữ liệu không phải JSON" }, { status: 400 });
  }
  try {
    const dsGiaoDich = nguon === "SEPAY" ? docWebhookSePay(body) : docWebhookCasso(body);
    const ketQua = [];
    for (const gd of dsGiaoDich) {
      const luu = await xuLyGiaoDichDen(gd);
      ketQua.push({ ma: gd.maGiaoDichNguon, trangThai: luu?.trangThai ?? "BO_QUA_TIEN_RA" });
    }
    // SePay coi 200/201 kèm success: true là đã nhận; Casso coi error: 0 là đã nhận
    return NextResponse.json({ success: true, error: 0, ketQua });
  } catch (error) {
    if (error instanceof WebhookKhongHopLeError) return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    throw error;
  }
}

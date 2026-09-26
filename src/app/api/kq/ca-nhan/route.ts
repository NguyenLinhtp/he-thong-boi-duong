import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { bangDiemCaNhan } from "@/server/services/kq/kq-05-tra-cuu";
import { phanHoiLoiKetQua } from "@/app/api/kq/_phan-hoi-loi";

// KQ-05: không nhận tham số học viên - luôn trả điểm của chính tài khoản đăng nhập.
export const GET = apiRoute(async () => {
  const phien = await requirePermission("KQ-05");
  try {
    return NextResponse.json(await bangDiemCaNhan(phien.userId));
  } catch (error) {
    return phanHoiLoiKetQua(error);
  }
});

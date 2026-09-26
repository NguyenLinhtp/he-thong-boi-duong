import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { kiemTraQuyenXemTaiLieu, noiDungTaiLieu, xoaTaiLieu } from "@/server/services/gd/gd-04-hoc-lieu";
import { phanHoiLoiHocLieu } from "../_phan-hoi-loi";

type Params = { params: Promise<{ id: string }> };

// GD-04: tải/xem tài liệu - "chỉ học viên trong khóa mới xem/tải được" (kiểm tra ở service)
export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  const phien = await requirePermission("GD-04");
  const { id } = await params;
  try {
    const taiLieu = await kiemTraQuyenXemTaiLieu(phien.userId, id);
    if (taiLieu.duongLink) return NextResponse.redirect(taiLieu.duongLink);
    const noiDung = await noiDungTaiLieu(taiLieu);
    const ten = taiLieu.tenFile ?? "tai-lieu";
    return new Response(new Uint8Array(noiDung), {
      headers: {
        // luôn tải xuống (attachment) + nosniff: trình duyệt không hiển thị nội dung tệp như trang web
        "Content-Type": taiLieu.loaiFile ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${ten.replace(/[^\w.-]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(ten)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return phanHoiLoiHocLieu(error);
  }
});

export const DELETE = apiRoute(async (_req: Request, { params }: Params) => {
  const phien = await requirePermission("GD-04");
  const { id } = await params;
  try {
    await xoaTaiLieu(phien.userId, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return phanHoiLoiHocLieu(error);
  }
});

import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { kiemTraQuyenXemTaiLieu, xoaTaiLieu } from "@/server/services/gd/gd-04-hoc-lieu";
import { phanHoiTep } from "@/lib/tep/phan-hoi-tep";
import { phanHoiLoiHocLieu } from "../_phan-hoi-loi";

type Params = { params: Promise<{ id: string }> };

// GD-04: tải/xem tài liệu - "chỉ học viên trong khóa mới xem/tải được" (kiểm tra ở service)
export const GET = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requirePermission("GD-04");
  const { id } = await params;
  try {
    const taiLieu = await kiemTraQuyenXemTaiLieu(phien.userId, id);
    if (taiLieu.duongLink) return NextResponse.redirect(taiLieu.duongLink);
    if (!taiLieu.khoaLuuTru) return NextResponse.json({ message: "Tài liệu không có tệp" }, { status: 404 });
    // mặc định tải xuống; ?xem=1 với kiểu an toàn (pdf, ảnh, video) thì xem trực tiếp, hỗ trợ Range
    return phanHoiTep(req, { khoaLuuTru: taiLieu.khoaLuuTru, tenFile: taiLieu.tenFile, loaiFile: taiLieu.loaiFile });
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

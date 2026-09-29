import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { nopSanPham } from "@/server/services/gd/gd-04-danh-gia";
import { phanHoiLoiHocLieu } from "@/app/api/gd/hoc-lieu/_phan-hoi-loi";

// GD-04 (bổ sung 28/09/2026): học viên nộp sản phẩm cuối khóa (multipart: khoaId, yeuCauId, ghiChu?, tep)
export const POST = apiRoute(async (req: Request) => {
  const phien = await requirePermission("GD-04");
  const form = await req.formData();
  const tep = form.get("tep");
  try {
    const baiNop = await nopSanPham(phien.userId, {
      khoaId: String(form.get("khoaId") ?? ""),
      yeuCauId: String(form.get("yeuCauId") ?? ""),
      ghiChu: String(form.get("ghiChu") ?? ""),
      tep: tep instanceof File ? { ten: tep.name, loai: tep.type, noiDung: Buffer.from(await tep.arrayBuffer()) } : { ten: "", loai: "", noiDung: Buffer.alloc(0) },
    });
    return NextResponse.json({ id: baiNop.id, tenFile: baiNop.tenFile }, { status: 201 });
  } catch (error) {
    return phanHoiLoiHocLieu(error);
  }
});

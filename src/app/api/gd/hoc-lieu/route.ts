import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { dangTaiLieu } from "@/server/services/gd/gd-04-hoc-lieu";
import { phanHoiLoiHocLieu } from "./_phan-hoi-loi";

// GD-04: giảng viên đăng tài liệu (multipart: khoaId, hocPhanId, lopId?, tieuDe, moTa?, tep | duongLink).
// Dùng route handler thay server action để không vướng giới hạn body 1MB của server action.
export const POST = apiRoute(async (req: Request) => {
  const phien = await requirePermission("GD-04");
  const form = await req.formData();
  const tep = form.get("tep");
  const coTep = tep instanceof File && tep.size > 0;
  try {
    const taiLieu = await dangTaiLieu(phien.userId, {
      khoaId: String(form.get("khoaId") ?? ""),
      hocPhanId: String(form.get("hocPhanId") ?? ""),
      lopId: String(form.get("lopId") ?? "") || null,
      tieuDe: String(form.get("tieuDe") ?? ""),
      moTa: String(form.get("moTa") ?? ""),
      duongLink: String(form.get("duongLink") ?? "") || null,
      tep: coTep ? { ten: tep.name, loai: tep.type, noiDung: Buffer.from(await tep.arrayBuffer()) } : null,
    });
    return NextResponse.json(taiLieu, { status: 201 });
  } catch (error) {
    return phanHoiLoiHocLieu(error);
  }
});

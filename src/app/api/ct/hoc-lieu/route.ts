import { NextResponse } from "next/server";
import { requirePermission, apiRoute } from "@/lib/auth/guard";
import type { LoaiHocLieu } from "@/generated/prisma/client";
import { themHocLieu } from "@/server/services/ct/ct-02-hoc-lieu";
import { nguoiTuPhien } from "@/server/services/qt/qt-03-nhat-ky";
import { phanHoiLoiHocLieu } from "@/app/api/gd/hoc-lieu/_phan-hoi-loi";

// CT-02 (bổ sung 28/09/2026): thêm học liệu khung cho học phần (multipart:
// hocPhanId, loai, tieuDe, moTa?, noiDung?, tep | duongLink). Route handler để
// không vướng giới hạn body 1MB của server action (video).
export const POST = apiRoute(async (req: Request) => {
  const phien = await requirePermission("CT-02");
  const form = await req.formData();
  const tep = form.get("tep");
  const coTep = tep instanceof File && tep.size > 0;
  try {
    const hocLieu = await themHocLieu(
      String(form.get("hocPhanId") ?? ""),
      {
        loai: String(form.get("loai") ?? "") as LoaiHocLieu,
        tieuDe: String(form.get("tieuDe") ?? ""),
        moTa: String(form.get("moTa") ?? ""),
        noiDung: String(form.get("noiDung") ?? ""),
        duongLink: String(form.get("duongLink") ?? "") || null,
        tep: coTep ? { ten: tep.name, loai: tep.type, noiDung: Buffer.from(await tep.arrayBuffer()) } : null,
      },
      nguoiTuPhien(phien),
    );
    return NextResponse.json(hocLieu, { status: 201 });
  } catch (error) {
    return phanHoiLoiHocLieu(error);
  }
});

import { NextResponse } from "next/server";
import { requireMotTrongCacQuyen, apiRoute } from "@/lib/auth/guard";
import { kiemTraQuyenXemHocLieuKhung } from "@/server/services/ct/ct-02-hoc-lieu";
import { phanHoiTep } from "@/lib/tep/phan-hoi-tep";
import { phanHoiLoiHocLieu } from "@/app/api/gd/hoc-lieu/_phan-hoi-loi";

type Params = { params: Promise<{ id: string }> };

// Xem/tải học liệu khung: cán bộ nội bộ, giảng viên phụ trách, học viên trong khóa (kiểm tra ở service)
export const GET = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requireMotTrongCacQuyen(["CT-02", "CT-05", "GD-04"]);
  const { id } = await params;
  try {
    const hocLieu = await kiemTraQuyenXemHocLieuKhung(phien, id);
    if (!hocLieu.khoaLuuTru) {
      return hocLieu.duongLink ? NextResponse.redirect(hocLieu.duongLink) : NextResponse.json({ message: "Mục này không có tệp" }, { status: 404 });
    }
    return phanHoiTep(req, { khoaLuuTru: hocLieu.khoaLuuTru, tenFile: hocLieu.tenFile, loaiFile: hocLieu.loaiFile });
  } catch (error) {
    return phanHoiLoiHocLieu(error);
  }
});

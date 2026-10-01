import { NextResponse } from "next/server";
import { requireMotTrongCacQuyen, apiRoute } from "@/lib/auth/guard";
import { kiemTraQuyenXemTepHoSo } from "@/server/services/hv/form-dang-ky";
import { KhongDuocXemTepHoSoError } from "@/server/services/hv/loi-hoc-vien";
import { phanHoiTep } from "@/lib/tep/phan-hoi-tep";

type Params = { params: Promise<{ id: string }> };

// (bổ sung 30/09/2026) tải tệp minh chứng nộp kèm form đăng ký - quyền kiểm tra theo hồ sơ trong service
// (bổ sung 01/10/2026) HP-02: cán bộ tài chính chỉ xem được minh chứng chuyển khoản lệ phí (kiểm tra trong service)
export const GET = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requireMotTrongCacQuyen(["HV-02", "HV-06", "HV-09", "HV-01", "HV-04", "HV-05", "HV-12", "HV-11", "DVLK-04", "HP-02"]);
  const { id } = await params;
  try {
    return phanHoiTep(req, await kiemTraQuyenXemTepHoSo(phien, id));
  } catch (error) {
    if (error instanceof KhongDuocXemTepHoSoError) return NextResponse.json({ message: error.message }, { status: 403 });
    throw error;
  }
});

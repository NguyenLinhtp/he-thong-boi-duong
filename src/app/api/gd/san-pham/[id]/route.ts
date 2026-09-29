import { requireMotTrongCacQuyen, apiRoute } from "@/lib/auth/guard";
import { kiemTraQuyenXemBaiNop } from "@/server/services/gd/gd-04-danh-gia";
import { phanHoiTep } from "@/lib/tep/phan-hoi-tep";
import { phanHoiLoiHocLieu } from "@/app/api/gd/hoc-lieu/_phan-hoi-loi";

type Params = { params: Promise<{ id: string }> };

// Tải bài nộp sản phẩm: học viên nộp, giảng viên phụ trách, cán bộ quản lý kết quả
export const GET = apiRoute(async (req: Request, { params }: Params) => {
  const phien = await requireMotTrongCacQuyen(["GD-04", "KQ-01", "KQ-02"]);
  const { id } = await params;
  try {
    const baiNop = await kiemTraQuyenXemBaiNop(phien, id);
    return phanHoiTep(req, baiNop);
  } catch (error) {
    return phanHoiLoiHocLieu(error);
  }
});

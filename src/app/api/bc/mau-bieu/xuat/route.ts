import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { xuatExcelTheoMau } from "@/server/services/bc/bc-04-mau-bieu";
import { khoangNgay } from "@/server/services/bc/khoang-ngay";
import { phanHoiLoiBaoCao, phanHoiExcel } from "@/app/api/bc/_phan-hoi-loi";

// BC-04: xuất Excel theo 1 phiên bản mẫu biểu (?mau=<id phiên bản>&tuNgay=&denNgay=&dot=)
export const GET = apiRoute(async (req: Request) => {
  const phien = await requirePermission("BC-04");
  const q = new URL(req.url).searchParams;
  try {
    const dotId = q.get("dot") || null;
    const dot = dotId ? await prisma.dotTuyenSinh.findUnique({ where: { id: dotId } }) : null;
    const { tenFile, noiDung } = await xuatExcelTheoMau(
      q.get("mau") ?? "",
      { ...khoangNgay(q.get("tuNgay"), q.get("denNgay")), dotTuyenSinhId: dotId },
      dot ? [`Đợt: ${dot.ten}`] : [],
      { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen },
    );
    return phanHoiExcel(tenFile, noiDung);
  } catch (error) {
    return phanHoiLoiBaoCao(error);
  }
});

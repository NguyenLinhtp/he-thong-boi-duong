import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { docLocBaoCaoDvlk, xuatExcelBaoCaoDvlk } from "@/server/services/dvlk/dvlk-07-bao-cao";
import { phanHoiLoiBaoCao, phanHoiExcel } from "@/app/api/bc/_phan-hoi-loi";

// DVLK-07: tải Excel báo cáo công nợ và doanh thu theo đơn vị liên kết (?tuNgay=&denNgay=&donVi=&khoa=)
export const GET = apiRoute(async (req: Request) => {
  await requirePermission("DVLK-07");
  const q = new URL(req.url).searchParams;
  try {
    const { loc, moTaLoc } = await docLocBaoCaoDvlk({
      tuNgay: q.get("tuNgay"),
      denNgay: q.get("denNgay"),
      donVi: q.get("donVi"),
      khoa: q.get("khoa"),
    });
    const { noiDung } = await xuatExcelBaoCaoDvlk(loc, moTaLoc);
    const hauTo = [q.get("tuNgay"), q.get("denNgay")].filter(Boolean).join("_");
    return phanHoiExcel(`BC-don-vi-lien-ket${hauTo ? `-${hauTo}` : ""}.xlsx`, noiDung);
  } catch (error) {
    return phanHoiLoiBaoCao(error);
  }
});

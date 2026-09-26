import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { docLocBaoCaoTaiChinh, xuatExcelBaoCaoTaiChinh } from "@/server/services/bc/bc-03-bao-cao-tai-chinh";
import { phanHoiLoiBaoCao, phanHoiExcel } from "@/app/api/bc/_phan-hoi-loi";

// BC-03: tải Excel báo cáo tài chính học phí (?tuNgay=&denNgay=&dot=&khoa=)
export const GET = apiRoute(async (req: Request) => {
  await requirePermission("BC-03");
  const q = new URL(req.url).searchParams;
  try {
    const { loc, moTaLoc } = await docLocBaoCaoTaiChinh({
      tuNgay: q.get("tuNgay"),
      denNgay: q.get("denNgay"),
      dot: q.get("dot"),
      khoa: q.get("khoa"),
    });
    const { noiDung } = await xuatExcelBaoCaoTaiChinh(loc, moTaLoc);
    const hauTo = [q.get("tuNgay"), q.get("denNgay")].filter(Boolean).join("_");
    return phanHoiExcel(`BC-tai-chinh-hoc-phi${hauTo ? `-${hauTo}` : ""}.xlsx`, noiDung);
  } catch (error) {
    return phanHoiLoiBaoCao(error);
  }
});

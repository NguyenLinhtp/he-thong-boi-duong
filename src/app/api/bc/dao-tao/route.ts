import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { docLocBaoCaoDaoTao, xuatExcelBaoCaoDaoTao } from "@/server/services/bc/bc-02-bao-cao-dao-tao";
import { phanHoiLoiBaoCao, phanHoiExcel } from "@/app/api/bc/_phan-hoi-loi";

// BC-02: tải Excel báo cáo hoạt động đào tạo (?tuNgay=&denNgay=&dot=&loaiHinh=&trangThai=)
export const GET = apiRoute(async (req: Request) => {
  await requirePermission("BC-02");
  const q = new URL(req.url).searchParams;
  try {
    const { loc, moTaLoc } = await docLocBaoCaoDaoTao({
      tuNgay: q.get("tuNgay"),
      denNgay: q.get("denNgay"),
      dot: q.get("dot"),
      loaiHinh: q.get("loaiHinh"),
      trangThai: q.get("trangThai"),
    });
    const { noiDung } = await xuatExcelBaoCaoDaoTao(loc, moTaLoc);
    const hauTo = [q.get("tuNgay"), q.get("denNgay")].filter(Boolean).join("_");
    return phanHoiExcel(`BC-dao-tao${hauTo ? `-${hauTo}` : ""}.xlsx`, noiDung);
  } catch (error) {
    return phanHoiLoiBaoCao(error);
  }
});

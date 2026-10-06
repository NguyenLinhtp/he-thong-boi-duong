import { requireMotTrongCacQuyen, apiRoute } from "@/lib/auth/guard";
import { xuatExcelTheoThanhPhan } from "@/server/services/hp/hp-01-thanh-phan-le-phi";
import { KhongTimThayKhoaError } from "@/server/services/hp/loi-hoc-phi";

type Params = { params: Promise<{ khoaId: string; thanhPhanId: string }> };

// (bổ sung 06/10/2026 - HV-07) Excel danh sách thí sinh theo 1 thành phần lệ phí (vd. ôn thi, thi) -
// chỉ cán bộ (quản lý khóa/xét duyệt/tài chính), không theo HV-05 vì HV-05 là quyền của học viên
export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requireMotTrongCacQuyen(["KH-01", "HV-07", "HP-02"]);
  const { khoaId, thanhPhanId } = await params;
  try {
    const { tenFile, noiDung } = await xuatExcelTheoThanhPhan(khoaId, thanhPhanId);
    return new Response(new Uint8Array(noiDung), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${tenFile.replace(/[^\w.-]/g, "_")}"`,
      },
    });
  } catch (error) {
    if (error instanceof KhongTimThayKhoaError) return Response.json({ loi: error.message }, { status: 404 });
    throw error;
  }
});

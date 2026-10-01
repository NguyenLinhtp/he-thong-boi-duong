import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { xuatExcelDoiSoat } from "@/server/services/hp/hp-02-doi-soat-excel";
import { KhongTimThayKhoaError } from "@/server/services/hp/loi-hoc-phi";

type Params = { params: Promise<{ khoaId: string }> };

// (bổ sung 01/10/2026 - HP-02) tải Excel danh sách đăng ký để đối soát lệ phí
export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("HP-02");
  const { khoaId } = await params;
  try {
    const { tenFile, noiDung } = await xuatExcelDoiSoat(khoaId);
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

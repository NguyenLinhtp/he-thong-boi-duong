import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { xuatExcelXetDuyet } from "@/server/services/hv/hv-07-xet-duyet-excel";
import { KhongTimThayKhoaError } from "@/server/services/hv/loi-hoc-vien";

type Params = { params: Promise<{ khoaId: string }> };

// (bổ sung 05/10/2026 - HV-07) tải Excel danh sách xét duyệt chính thức để ghi kết quả rồi tải lên lại
export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("HV-07");
  const { khoaId } = await params;
  try {
    const { tenFile, noiDung } = await xuatExcelXetDuyet(khoaId);
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

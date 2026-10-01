import { requireMotTrongCacQuyen, apiRoute } from "@/lib/auth/guard";
import { xuatDanhSachChinhThucDuThi } from "@/server/services/hv/hv-07-chot-danh-sach-du-thi";
import { ChotDanhSachDuThiError, KhongTimThayKhoaError } from "@/server/services/hv/loi-hoc-vien";

type Params = { params: Promise<{ khoaId: string }> };

// (bổ sung 01/10/2026 - HV-07) Excel danh sách thí sinh chính thức của khóa dự thi
export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requireMotTrongCacQuyen(["HP-02", "HV-07"]);
  const { khoaId } = await params;
  try {
    const { tenFile, noiDung } = await xuatDanhSachChinhThucDuThi(khoaId);
    return new Response(new Uint8Array(noiDung), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${tenFile.replace(/[^\w.-]/g, "_")}"`,
      },
    });
  } catch (error) {
    if (error instanceof KhongTimThayKhoaError) return Response.json({ loi: error.message }, { status: 404 });
    if (error instanceof ChotDanhSachDuThiError) return Response.json({ loi: error.message }, { status: 400 });
    throw error;
  }
});

import { requireMotTrongCacQuyen, apiRoute } from "@/lib/auth/guard";
import { PhongThiError, xuatExcelPhongThi } from "@/server/services/kh/kh-03-phong-thi";

type Params = { params: Promise<{ dotThiId: string }> };

// (bổ sung 12/10/2026 - KH-03) Excel danh sách thí sinh theo phòng thi/lớp ôn của 1 đợt
export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requireMotTrongCacQuyen(["KH-01", "KH-03", "KQ-06"]);
  const { dotThiId } = await params;
  try {
    const { tenFile, noiDung } = await xuatExcelPhongThi(dotThiId);
    return new Response(new Uint8Array(noiDung), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${tenFile.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^\w.-]/g, "_")}"`,
      },
    });
  } catch (error) {
    if (error instanceof PhongThiError) return Response.json({ loi: error.message }, { status: 404 });
    throw error;
  }
});

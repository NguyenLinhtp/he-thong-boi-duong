import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { xuatExcelDanhSachHoanThanh } from "@/server/services/cc/xuat-danh-sach-hoan-thanh";
import { phanHoiLoiChungChi } from "@/app/api/cc/_phan-hoi-loi";

type Params = { params: Promise<{ khoaId: string }> };

// CC-01 (bổ sung): tải Excel danh sách học viên hoàn thành - ?lop=<id lớp> để lọc theo lớp
export const GET = apiRoute(async (req: Request, { params }: Params) => {
  await requirePermission("CC-01");
  const { khoaId } = await params;
  const lopId = new URL(req.url).searchParams.get("lop") || null;
  try {
    const { tenFile, noiDung } = await xuatExcelDanhSachHoanThanh(khoaId, lopId);
    // tên file chỉ gồm ký tự ASCII an toàn cho header; filename* giữ nguyên nếu có ký tự khác
    const tenAscii = tenFile.replace(/[^\w.-]/g, "_");
    return new Response(new Uint8Array(noiDung), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${tenAscii}"; filename*=UTF-8''${encodeURIComponent(tenFile)}`,
      },
    });
  } catch (error) {
    return phanHoiLoiChungChi(error);
  }
});

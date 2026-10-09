import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { mauExcelImportKhoa } from "@/server/services/hv/hv-03-import-danh-sach";

type Params = { params: Promise<{ khoaId: string }> };

// (bổ sung 08/10/2026 - HV-03) tệp Excel mẫu danh sách học viên được cử đi học - cột theo form đăng ký của khóa
export const GET = apiRoute(async (_req: Request, { params }: Params) => {
  await requirePermission("HV-03");
  const { khoaId } = await params;
  const khoa = await prisma.khoa.findUnique({ where: { id: khoaId }, select: { maKhoa: true } });
  if (!khoa) return new Response("Không tìm thấy khóa", { status: 404 });
  return new Response(new Uint8Array(await mauExcelImportKhoa(khoaId)), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="mau-danh-sach-${khoa.maKhoa}.xlsx"`,
    },
  });
});

import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { mauExcelSinhVien } from "@/server/services/hv/hv-03-danh-sach-sinh-vien";

// (bổ sung 01/10/2026) tệp Excel mẫu danh sách sinh viên
export const GET = apiRoute(async () => {
  await requirePermission("HV-03");
  return new Response(new Uint8Array(await mauExcelSinhVien()), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-danh-sach-sinh-vien.xlsx"',
    },
  });
});

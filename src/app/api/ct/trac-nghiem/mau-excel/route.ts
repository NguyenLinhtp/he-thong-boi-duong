import { requirePermission, apiRoute } from "@/lib/auth/guard";
import { mauExcelCauHoi } from "@/server/services/ct/ct-02-hoc-lieu";

// Tệp Excel mẫu nhập câu hỏi trắc nghiệm
export const GET = apiRoute(async () => {
  await requirePermission("CT-02");
  return new Response(new Uint8Array(await mauExcelCauHoi()), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-cau-hoi-trac-nghiem.xlsx"',
    },
  });
});

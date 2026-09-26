import { NextResponse } from "next/server";
import { LoiBaoCao } from "@/server/services/bc/loi-bao-cao";

/** Lỗi nghiệp vụ BC (vd kỳ báo cáo sai) -> 400; lỗi khác ném tiếp. */
export function phanHoiLoiBaoCao(error: unknown): Response {
  if (error instanceof LoiBaoCao) return NextResponse.json({ message: error.message }, { status: 400 });
  throw error;
}

/** Trả file .xlsx tải xuống - tên file ASCII cho header, filename* giữ nguyên. */
export function phanHoiExcel(tenFile: string, noiDung: Buffer): Response {
  const tenAscii = tenFile.replace(/[^\w.-]/g, "_");
  return new Response(new Uint8Array(noiDung), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${tenAscii}"; filename*=UTF-8''${encodeURIComponent(tenFile)}`,
    },
  });
}

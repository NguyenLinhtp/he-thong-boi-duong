import { kichThuocTep, luongTep } from "@/server/services/gd/luu-tru-hoc-lieu";

// Chỉ các kiểu an toàn mới được hiển thị ngay trong trình duyệt (không HTML/SVG/script)
const KIEU_XEM_TRUC_TIEP: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

/**
 * Phản hồi tệp đã kiểm tra quyền: mặc định tải xuống (attachment); ?xem=1 với
 * kiểu an toàn thì hiển thị trực tiếp, hỗ trợ Range để tua video.
 */
export async function phanHoiTep(req: Request, tep: { khoaLuuTru: string; tenFile: string | null; loaiFile: string | null }) {
  const ten = tep.tenFile ?? "tep";
  const duoi = ten.slice(ten.lastIndexOf(".")).toLowerCase();
  const xem = new URL(req.url).searchParams.get("xem") === "1" && duoi in KIEU_XEM_TRUC_TIEP;
  const tong = await kichThuocTep(tep.khoaLuuTru);
  const tieuDeChung: Record<string, string> = {
    "Content-Type": xem ? KIEU_XEM_TRUC_TIEP[duoi] : "application/octet-stream",
    "Content-Disposition": `${xem ? "inline" : "attachment"}; filename="${ten.replace(/[^\w.-]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(ten)}`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
    "Accept-Ranges": "bytes",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    let batDau = range[1] ? Number(range[1]) : Math.max(0, tong - Number(range[2]));
    let ketThuc = range[1] && range[2] ? Number(range[2]) : tong - 1;
    ketThuc = Math.min(ketThuc, tong - 1);
    if (batDau > ketThuc || batDau >= tong) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${tong}` } });
    }
    batDau = Math.max(0, batDau);
    return new Response(luongTep(tep.khoaLuuTru, batDau, ketThuc), {
      status: 206,
      headers: { ...tieuDeChung, "Content-Range": `bytes ${batDau}-${ketThuc}/${tong}`, "Content-Length": String(ketThuc - batDau + 1) },
    });
  }
  return new Response(luongTep(tep.khoaLuuTru), { headers: { ...tieuDeChung, "Content-Length": String(tong) } });
}

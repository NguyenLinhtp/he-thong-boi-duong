import { headers } from "next/headers";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";

/** Tên miền chính thức dự kiến của hệ thống (đặc tả KH-06). */
export const URL_GOC_CHINH_THUC = "https://dangky.ued.udn.vn";

/**
 * Địa chỉ gốc để sinh link công khai (đăng ký khóa KH-06, xác thực văn bằng CC-05):
 * 1. tham số QT-05 URL_GOC_HE_THONG (khi đã triển khai lên tên miền chính thức);
 * 2. địa chỉ máy chủ đang phục vụ yêu cầu (chạy thử localhost/UAT - link bấm được ngay);
 * 3. tên miền chính thức (ngoài ngữ cảnh yêu cầu HTTP: script, test, tác vụ nền).
 */
export async function urlGocHeThong(): Promise<string> {
  const cauHinh = (await layThamSo("URL_GOC_HE_THONG"))?.trim();
  if (cauHinh) return cauHinh.replace(/\/+$/, "");
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const giaoThuc = h.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "http" : "https");
      return `${giaoThuc}://${host}`;
    }
  } catch {
    // headers() chỉ dùng được trong ngữ cảnh yêu cầu
  }
  return URL_GOC_CHINH_THUC;
}

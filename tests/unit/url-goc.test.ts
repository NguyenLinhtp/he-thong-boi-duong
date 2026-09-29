import { beforeEach, describe, expect, it, vi } from "vitest";

// giả lập tham số QT-05 và header yêu cầu - không ghi CSDL để không ảnh hưởng test KH-06/CC-05 chạy song song
const thamSo = new Map<string, string>();
let header: Record<string, string> | null = null;
vi.mock("@/server/services/qt/qt-05-tham-so", () => ({ layThamSo: async (ma: string) => thamSo.get(ma) ?? null }));
vi.mock("next/headers", () => ({
  headers: async () => {
    if (!header) throw new Error("headers() ngoài ngữ cảnh yêu cầu");
    const h = header;
    return { get: (k: string) => h[k] ?? null };
  },
}));

const { urlGocHeThong, URL_GOC_CHINH_THUC } = await import("@/server/services/qt/url-goc");

describe("Địa chỉ gốc link công khai (KH-06, CC-05 - bổ sung 29/09/2026)", () => {
  beforeEach(() => {
    thamSo.clear();
    header = null;
  });

  it("chạy thử: không cấu hình thì lấy theo máy chủ đang phục vụ (localhost -> http)", async () => {
    header = { host: "localhost:3000" };
    expect(await urlGocHeThong()).toBe("http://localhost:3000");
    header = { host: "uat.ued.udn.vn", "x-forwarded-proto": "https" };
    expect(await urlGocHeThong()).toBe("https://uat.ued.udn.vn");
  });

  it("tham số QT-05 URL_GOC_HE_THONG được ưu tiên hơn máy chủ đang chạy, bỏ dấu / cuối", async () => {
    thamSo.set("URL_GOC_HE_THONG", "https://dangky.ued.udn.vn/ ");
    header = { host: "localhost:3000" };
    expect(await urlGocHeThong()).toBe("https://dangky.ued.udn.vn");
  });

  it("ngoài ngữ cảnh yêu cầu (script/tác vụ nền) và chưa cấu hình: dùng tên miền chính thức", async () => {
    expect(await urlGocHeThong()).toBe(URL_GOC_CHINH_THUC);
  });

  it("tham số để trống không được dùng", async () => {
    thamSo.set("URL_GOC_HE_THONG", "   ");
    header = { host: "localhost:3000" };
    expect(await urlGocHeThong()).toBe("http://localhost:3000");
  });
});

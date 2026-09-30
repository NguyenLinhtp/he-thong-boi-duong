import type { TruongForm } from "@/lib/form-dang-ky";
import type { GiaTriBanDau } from "@/components/dang-ky/cac-truong-dang-ky";

// dữ liệu dựng form đăng ký theo cấu hình của khóa (bổ sung 30/09/2026)
export type DuLieuDungForm = {
  truong: TruongForm[];
  dsChucDanh: { id: string; ten: string }[];
  // điền sẵn từ hồ sơ học viên đang đăng nhập (null nếu khách)
  giaTri: GiaTriBanDau | null;
};

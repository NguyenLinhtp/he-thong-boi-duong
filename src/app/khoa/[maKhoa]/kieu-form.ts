import type { DinhDanh, TruongForm } from "@/lib/form-dang-ky";
import type { GiaTriBanDau } from "@/components/dang-ky/cac-truong-dang-ky";
import type { ThanhPhanHien } from "@/components/dang-ky/chon-thanh-phan-le-phi";

// dữ liệu dựng form đăng ký theo cấu hình của khóa (bổ sung 30/09/2026)
export type DuLieuDungForm = {
  // (bổ sung 01/10/2026) CCCD (mặc định) hoặc mã sinh viên (PT3)
  dinhDanh?: DinhDanh;
  truong: TruongForm[];
  dsChucDanh: { id: string; ten: string }[];
  // điền sẵn từ hồ sơ học viên đang đăng nhập (null nếu khách)
  giaTri: GiaTriBanDau | null;
  // (bổ sung 01/10/2026) lệ phí theo đối tượng (khóa dự thi có lệ phí thí sinh tự do riêng)
  lePhi?: { sinhVien: string; tuDo: string } | null;
  // (bổ sung 06/10/2026) thành phần lệ phí (vd. ôn thi, thi) - thí sinh chọn, tổng tiền cộng theo mục
  thanhPhan?: ThanhPhanHien[];
};

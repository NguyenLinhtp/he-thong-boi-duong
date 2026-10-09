/**
 * (bổ sung 08/10/2026 - CT-07) Một chương trình chọn được nhiều phương thức đăng ký trong nhóm đào
 * tạo bồi dưỡng (PT1, PT2, PT4); Phương thức 3 (chỉ dự thi, không qua học) luôn đứng riêng. Mọi khóa
 * của chương trình dùng theo danh sách phương thức hiện hành của chương trình. Module thuần - dùng
 * được ở trình duyệt và máy chủ.
 */

export const DS_PHUONG_THUC = ["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN", "QUA_DON_VI_LIEN_KET", "CHI_DU_THI"] as const;
export type MaPhuongThuc = (typeof DS_PHUONG_THUC)[number];

export const PHUONG_THUC_DAO_TAO: MaPhuongThuc[] = ["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN", "QUA_DON_VI_LIEN_KET"];

export const MA_NGAN_PHUONG_THUC: Record<MaPhuongThuc, string> = {
  TRUC_TUYEN_NOP_GIAY: "PT1",
  IMPORT_TU_XAC_NHAN: "PT2",
  CHI_DU_THI: "PT3",
  QUA_DON_VI_LIEN_KET: "PT4",
};

export const TEN_PHUONG_THUC: Record<MaPhuongThuc, string> = {
  TRUC_TUYEN_NOP_GIAY: "Đăng ký trực tuyến, in đơn nộp bản giấy",
  IMPORT_TU_XAC_NHAN: "Danh sách được cử đi học, học viên tự xác nhận",
  CHI_DU_THI: "Chỉ đăng ký dự thi, không qua học",
  QUA_DON_VI_LIEN_KET: "Qua đơn vị liên kết",
};

/** Theo thứ tự PT1 → PT4, bỏ trùng. */
export function sapXepPhuongThuc(ds: readonly string[]): MaPhuongThuc[] {
  return (["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN", "CHI_DU_THI", "QUA_DON_VI_LIEN_KET"] as MaPhuongThuc[]).filter((m) => ds.includes(m));
}

/** "PT1, PT4" - rỗng thì giá trị thay thế. */
export function nhanNganPhuongThuc(ds: readonly string[], rong = "—") {
  const sx = sapXepPhuongThuc(ds);
  return sx.length ? sx.map((m) => MA_NGAN_PHUONG_THUC[m]).join(", ") : rong;
}

/** "PT1 · Đăng ký trực tuyến...; PT4 · Qua đơn vị liên kết" */
export function nhanDayDuPhuongThuc(ds: readonly string[], rong = "Chưa thiết lập") {
  const sx = sapXepPhuongThuc(ds);
  return sx.length ? sx.map((m) => `${MA_NGAN_PHUONG_THUC[m]} · ${TEN_PHUONG_THUC[m]}`).join("; ") : rong;
}

export const laPhuongThucDuThi = (ds: readonly string[]) => ds.includes("CHI_DU_THI");

/** Lỗi của tập phương thức chọn cho 1 chương trình (null = hợp lệ). */
export function loiTapPhuongThuc(ds: readonly string[]): string | null {
  if (ds.length === 0) return "Chọn ít nhất 1 phương thức đăng ký";
  if (ds.some((m) => !(DS_PHUONG_THUC as readonly string[]).includes(m))) return "Phương thức đăng ký không hợp lệ";
  if (ds.includes("CHI_DU_THI") && ds.length > 1) {
    return "Phương thức 3 (chỉ đăng ký dự thi) đứng riêng, không chọn chung với phương thức đào tạo";
  }
  return null;
}

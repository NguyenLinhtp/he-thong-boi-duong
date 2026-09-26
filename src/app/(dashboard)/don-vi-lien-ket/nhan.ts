export const NHAN_TRANG_THAI_HOP_TAC: Record<string, string> = {
  DANG_HOP_TAC: "Đang hợp tác",
  TAM_NGUNG: "Tạm ngừng",
};

export const NHAN_TRANG_THAI_HOP_DONG: Record<string, string> = {
  DANG_TRIEN_KHAI: "Đang triển khai",
  DA_THANH_LY: "Đã thanh lý",
};

// trạng thái hồ sơ nhìn từ phía đơn vị liên kết (HV-11/12, DVLK-05)
export const NHAN_TRANG_THAI_HO_SO: Record<string, string> = {
  CHO_NOP_GIAY: "Chờ ĐVLK thu hồ sơ giấy",
  DA_NOP_GIAY: "Đã nộp hồ sơ giấy - chờ duyệt",
  HUY_QUA_HAN_NOP_GIAY: "Hủy (quá hạn thu hồ sơ)",
  CHO_DUYET: "Chờ duyệt",
  HOP_LE: "Hợp lệ",
  KHONG_HOP_LE: "Không hợp lệ",
  CHINH_THUC: "Chính thức",
  HOAN_THANH: "Hoàn thành",
  THOI_HOC: "Thôi học",
};

export const dinhDangTien = (so: unknown) =>
  so === null || so === undefined ? "—" : `${Number(so).toLocaleString("vi-VN")} đ`;

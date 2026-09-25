export class KhongDuocPhanCongBuoiHocError extends Error {
  constructor() {
    super("Bạn không được phân công phụ trách buổi học này");
  }
}

export class KhongPhaiTaiKhoanGiangVienError extends Error {
  constructor() {
    super("Tài khoản đăng nhập chưa gắn với hồ sơ giảng viên nào");
  }
}

export class ThieuLyDoThayDoiError extends Error {
  constructor() {
    super("Lý do thay đổi lịch/nghỉ học là bắt buộc");
  }
}

export class BuoiHocDaHuyError extends Error {
  constructor() {
    super("Buổi học đã bị hủy trước đó");
  }
}

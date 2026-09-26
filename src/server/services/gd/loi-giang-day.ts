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

// GD-04: lỗi nghiệp vụ học liệu số - thông điệp an toàn để hiện cho người dùng
export class LoiHocLieu extends Error {}

export class KhongDuocXemTaiLieuError extends LoiHocLieu {
  constructor() {
    super("Chỉ học viên trong khóa (và giảng viên phụ trách) mới xem/tải được tài liệu này");
  }
}

export class KhongPhuTrachHocPhanError extends LoiHocLieu {
  constructor() {
    super("Bạn không được phân công phụ trách học phần này (ở lớp/khóa đã chọn)");
  }
}

export class TaiLieuKhongHopLeError extends LoiHocLieu {
  constructor(chiTiet: string) {
    super(`Tài liệu không hợp lệ: ${chiTiet}`);
  }
}

export class KhoaKhongGiangDayError extends LoiHocLieu {
  constructor() {
    super("Khóa chỉ đăng ký dự thi (Phương thức 3) - không áp dụng giảng dạy/học liệu");
  }
}

export class KhongTimThayTaiLieuError extends LoiHocLieu {
  constructor() {
    super("Không tìm thấy tài liệu");
  }
}

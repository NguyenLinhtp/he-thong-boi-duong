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

// ---- bổ sung 28/09/2026: học liệu khung chương trình, trắc nghiệm, sản phẩm cuối khóa ----

export class ChuongTrinhDaNgungError extends LoiHocLieu {
  constructor() {
    super("Chương trình đã ngừng hiệu lực - không sửa học liệu/yêu cầu đánh giá");
  }
}

export class BaiDaCoNguoiLamError extends LoiHocLieu {
  constructor() {
    super("Bài trắc nghiệm đã có học viên làm - không sửa/xóa câu hỏi hay xóa bài (vẫn đổi được cấu hình tính điểm)");
  }
}

export class YeuCauDaCoBaiNopError extends LoiHocLieu {
  constructor() {
    super("Yêu cầu sản phẩm đã có học viên nộp bài - không xóa được");
  }
}

export class DanhGiaKhongHopLeError extends LoiHocLieu {
  constructor(chiTiet: string) {
    super(`Không hợp lệ: ${chiTiet}`);
  }
}

export class KhongDuocLamDanhGiaError extends LoiHocLieu {
  constructor(lyDo: string) {
    super(lyDo);
  }
}

export class HetLuotLamBaiError extends LoiHocLieu {
  constructor(soLan: number) {
    super(`Đã hết lượt làm bài (tối đa ${soLan} lần)`);
  }
}

export class HetGioLamBaiError extends LoiHocLieu {
  constructor() {
    super("Đã hết thời gian làm bài - bài nộp sau giờ không được chấm");
  }
}

export class DaChamKhongNopLaiError extends LoiHocLieu {
  constructor() {
    super("Sản phẩm đã được chấm - không nộp lại được");
  }
}

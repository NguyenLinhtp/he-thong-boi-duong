export class KhongTimThayKhoaError extends Error {
  constructor() {
    super("Không tìm thấy khóa bồi dưỡng");
  }
}

export class KhongTimThayGiangVienError extends Error {
  constructor() {
    super("Không tìm thấy giảng viên");
  }
}

export class KhongTimThayBuoiHocError extends Error {
  constructor() {
    super("Không tìm thấy buổi học");
  }
}

export class HocPhanKhongThuocChuongTrinhError extends Error {
  constructor() {
    super("Học phần không thuộc chương trình của khóa này");
  }
}

export class TrungLichGiangVienError extends Error {
  constructor() {
    super("Giảng viên đã được phân công ở 1 khóa khác trùng thời gian");
  }
}

export class TrungLichGiangVienTheoBuoiError extends Error {
  constructor() {
    super("Giảng viên đã có buổi dạy khác trùng ngày/giờ này");
  }
}

export class TrungPhongHocError extends Error {
  constructor() {
    super("Phòng học đã được xếp cho 1 buổi học khác trùng ngày/giờ này");
  }
}

export class KhoaKhongPhaiTrucTuyenError extends Error {
  constructor() {
    super("Khóa không ở hình thức trực tuyến");
  }
}

export class ThieuLinkTrucTuyenError extends Error {
  constructor() {
    super("Khóa trực tuyến còn buổi học chưa có link - phải hoàn tất trước ngày khai giảng");
  }
}

export class ChuyenTrangThaiKhoaKhongHopLeError extends Error {
  constructor(tu: string, den: string) {
    super(`Không thể chuyển trạng thái khóa từ "${tu}" sang "${den}"`);
  }
}

export class KhoaChuaMoDangKyError extends Error {
  constructor() {
    super(
      "Khóa chưa/không còn mở đăng ký (chỉ Đang tuyển sinh và chưa đủ sĩ số mới phát hành được thông báo/link)",
    );
  }
}

// ---- KH-07: lớp trong khóa ----------------------------------------------
/** Lớp cơ sở lỗi nghiệp vụ KH-07 - thông điệp an toàn để hiện cho người dùng. */
export class LoiLopHoc extends Error {}

export class KhongTimThayLopError extends LoiLopHoc {
  constructor() {
    super("Không tìm thấy lớp");
  }
}

export class LopKhongThuocKhoaError extends LoiLopHoc {
  constructor() {
    super("Lớp không thuộc khóa này - chỉ xếp/chuyển lớp trong cùng khóa (chuyển khóa theo HV-09)");
  }
}

// HV-05: "Khóa thuộc Phương thức 3 không áp dụng điểm danh/giảng dạy"
export class KhoaChiDuThiKhongGiangDayError extends Error {
  constructor() {
    super("Khóa Phương thức 3 (chỉ dự thi) không có giảng dạy - không phân công giảng viên/xếp thời khóa biểu");
  }
}

export class KhoaChiDuThiKhongChiaLopError extends LoiLopHoc {
  constructor() {
    super("Khóa Phương thức 3 (chỉ dự thi) không có giảng dạy nên không chia lớp");
  }
}

export class KhoaDaDongKhongChiaLopError extends LoiLopHoc {
  constructor() {
    super("Khóa đã kết thúc/hủy hoặc kết quả đã phê duyệt - không thay đổi lớp được nữa");
  }
}

export class TongSiSoLopVuotKhoaError extends LoiLopHoc {
  constructor() {
    super("Tổng sĩ số tối đa các lớp vượt sĩ số tối đa của khóa");
  }
}

export class SiSoLopNhoHonHienTaiError extends LoiLopHoc {
  constructor() {
    super("Sĩ số tối đa không được nhỏ hơn số học viên đang ở trong lớp");
  }
}

export class LopDaDuSiSoError extends LoiLopHoc {
  constructor() {
    super("Lớp đích đã đủ sĩ số");
  }
}

export class LopDangSuDungError extends LoiLopHoc {
  constructor() {
    super("Lớp đang có học viên, buổi học, phân công hoặc lịch sử chuyển lớp - không xóa được");
  }
}

export class KhongTimThayDangKyLopError extends LoiLopHoc {
  constructor() {
    super("Không tìm thấy đăng ký học");
  }
}

export class HocVienChuaChinhThucError extends LoiLopHoc {
  constructor() {
    super("Chỉ xếp lớp cho học viên đã vào danh sách chính thức (HV-07)");
  }
}

export class DaOLopNayError extends LoiLopHoc {
  constructor() {
    super("Học viên đang ở lớp này rồi");
  }
}

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

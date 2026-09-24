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

/** Lớp cơ sở cho lỗi nghiệp vụ module KQ - thông điệp an toàn để hiện cho người dùng. */
export class LoiKetQua extends Error {}

export class KhongTimThayKhoaError extends LoiKetQua {
  constructor() {
    super("Không tìm thấy khóa bồi dưỡng");
  }
}

// KQ-01: "Chỉ nhập được cho học phần mình phụ trách".
export class KhongPhuTrachHocPhanError extends LoiKetQua {
  constructor() {
    super("Bạn không được phân công phụ trách học phần này trong khóa");
  }
}

// KQ-01/KQ-06: "điểm trong khoảng 0–10".
export class DiemKhongHopLeError extends LoiKetQua {
  constructor() {
    super("Điểm phải nằm trong khoảng 0–10");
  }
}

export class HocVienKhongThuocKhoaError extends LoiKetQua {
  constructor() {
    super("Học viên không thuộc danh sách chính thức của khóa");
  }
}

// HV-05/KQ-06: khóa Phương thức 3 không có giảng dạy - nhập kết quả thi trực
// tiếp (KQ-06), không nhập điểm học phần/tổng hợp chuyên cần.
export class KhoaChiDuThiError extends LoiKetQua {
  constructor() {
    super("Khóa thuộc Phương thức 3 (chỉ dự thi) - nhập kết quả thi trực tiếp (KQ-06)");
  }
}

export class KhongPhaiKhoaChiDuThiError extends LoiKetQua {
  constructor() {
    super("Chỉ nhập kết quả thi trực tiếp cho khóa thuộc Phương thức 3 (chỉ dự thi)");
  }
}

// KQ-04: "Không sửa điểm sau khi đã phê duyệt, trừ khi có quyết định phúc khảo".
export class KetQuaDaPheDuyetError extends LoiKetQua {
  constructor() {
    super("Kết quả đã được phê duyệt - chỉ sửa được theo quyết định phúc khảo");
  }
}

export class ChuaPheDuyetKhongCanPhucKhaoError extends LoiKetQua {
  constructor() {
    super("Kết quả chưa phê duyệt - sửa điểm trực tiếp, không cần phúc khảo");
  }
}

export class ThieuSoQuyetDinhError extends LoiKetQua {
  constructor() {
    super("Cần nhập số quyết định");
  }
}

export class KhongTimThayKetQuaError extends LoiKetQua {
  constructor() {
    super("Không tìm thấy kết quả");
  }
}

export class ChuaTongHopKetQuaError extends LoiKetQua {
  constructor() {
    super("Chưa có kết quả toàn khóa cho mọi học viên chính thức - cần tổng hợp (KQ-02) hoặc nhập kết quả thi (KQ-06) trước");
  }
}

export class ChuaXetDieuKienError extends LoiKetQua {
  constructor() {
    super("Chưa xét điều kiện hoàn thành khóa (KQ-03) cho mọi học viên");
  }
}

// KQ-05: tài khoản đăng nhập chưa gắn với hồ sơ học viên nào.
export class KhongPhaiTaiKhoanHocVienError extends LoiKetQua {
  constructor() {
    super("Tài khoản đăng nhập chưa gắn với hồ sơ học viên nào");
  }
}

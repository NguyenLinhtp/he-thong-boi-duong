export class KhongTimThayKhoaError extends Error {
  constructor() {
    super("Không tìm thấy khóa bồi dưỡng");
  }
}

export class KhongTimThayDangKyError extends Error {
  constructor() {
    super("Không tìm thấy hồ sơ đăng ký");
  }
}

export class SaiPhuongThucDangKyError extends Error {
  constructor(phuongThucCanApDung: string) {
    super(`Chương trình của khóa này không áp dụng ${phuongThucCanApDung}`);
  }
}

export class KhoaKhongMoDangKyError extends Error {
  constructor() {
    super("Khóa hiện không mở đăng ký (đã đóng đăng ký hoặc đã đủ sĩ số)");
  }
}

export class DaDangKyKhoaNayError extends Error {
  constructor() {
    super("Học viên đã đăng ký khóa này rồi, không thể đăng ký trùng lần 2");
  }
}

export class SaiTrangThaiXacNhanNopGiayError extends Error {
  constructor() {
    super('Chỉ xác nhận nộp giấy được với hồ sơ đang ở trạng thái "chờ nộp bản giấy"');
  }
}

export class DaQuaHanNopGiayError extends Error {
  constructor() {
    super("Hồ sơ đã quá hạn nộp bản giấy, đăng ký đã tự động bị hủy");
  }
}

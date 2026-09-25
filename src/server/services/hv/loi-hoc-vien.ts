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

export type DongLoiImport = { dong: number; loi: string };

export class DuLieuImportLoiError extends Error {
  constructor(public readonly cacDongLoi: DongLoiImport[]) {
    super(
      `File import có ${cacDongLoi.length} dòng lỗi, chưa nạp dữ liệu nào - vui lòng chỉnh sửa và tải lên lại`,
    );
  }
}

export class FileImportRongError extends Error {
  constructor() {
    super("File import không có dữ liệu (cần dòng tiêu đề + ít nhất 1 dòng dữ liệu)");
  }
}

export class KhoaKhongConNhanImportError extends Error {
  constructor() {
    super("Khóa đã kết thúc tuyển sinh, không thể import thêm danh sách học viên");
  }
}

export class ImportVuotSiSoToiDaError extends Error {
  constructor(soChoConLai: number) {
    super(`Số dòng import vượt quá sĩ số còn trống của khóa (còn ${soChoConLai} chỗ)`);
  }
}

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

export class KhongKhopDuLieuImportError extends Error {
  constructor() {
    super("CCCD/mã số không khớp với dữ liệu đã import cho khóa này");
  }
}

export class DaXacNhanThamGiaError extends Error {
  constructor() {
    super("Đã xác nhận tham gia trước đó, không thể xác nhận trùng lần 2");
  }
}

export class KhoaChuaMoXacNhanThamGiaError extends Error {
  constructor() {
    super("Khóa chưa/không còn mở xác nhận tham gia (chỉ mở khi khóa Đang tuyển sinh)");
  }
}

export class SaiTrangThaiThamDinhError extends Error {
  constructor() {
    super(
      'Chỉ thẩm định được hồ sơ đã hoàn tất bước đăng ký (chờ duyệt/đã nộp giấy/đã xác nhận tham gia) hoặc đang ở kết quả thẩm định trước đó',
    );
  }
}

export class DanhSachXetDuyetRongError extends Error {
  constructor() {
    super("Chưa chọn hồ sơ nào để xét duyệt chính thức");
  }
}

export class DanhSachXetDuyetKhongHopLeError extends Error {
  constructor() {
    super("Có hồ sơ trong danh sách chọn không thuộc khóa này hoặc chưa được đánh dấu Hợp lệ (HV-06)");
  }
}

export class VuotSiSoKhiXetDuyetError extends Error {
  constructor(soChoConLai: number) {
    super(`Số lượng xét duyệt chính thức vượt sĩ số tối đa của khóa (còn ${soChoConLai} chỗ)`);
  }
}

export class KhongTimThayHocVienError extends Error {
  constructor() {
    super("Không tìm thấy học viên");
  }
}

export class CccdTrungError extends Error {
  constructor() {
    super("Số CCCD đã được dùng cho 1 học viên khác trong hệ thống");
  }
}

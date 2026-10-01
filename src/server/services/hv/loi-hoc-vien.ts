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
  // (bổ sung 01/10/2026) hồ sơ đã có - chỉ gửi kèm khi danh tính đã được xác minh (mã SV + 4 số cuối CCCD)
  constructor(public readonly dangKyId?: string) {
    super("Học viên đã đăng ký khóa này rồi, không thể đăng ký trùng lần 2");
  }
}

export class SaiTrangThaiXacNhanNopGiayError extends Error {
  constructor() {
    super('Chỉ xác nhận nộp giấy được với hồ sơ đang ở trạng thái "chờ nộp bản giấy"');
  }
}

// DVLK-05: hồ sơ gắn hợp đồng liên kết do đơn vị liên kết thu giấy, xác nhận theo lô ở DVLK-05
// HV-09: tiền đã nộp gắn theo khóa (HocPhi/PhieuThu) - xóa/chuyển khóa sẽ bỏ
// rơi khoản đã thu; hoàn/chuyển học phí là quyết định của tài chính
export class DaNopHocPhiKhoaNayError extends Error {
  constructor() {
    super(
      "Học viên đã nộp học phí cho khóa này - không xóa/chuyển khóa; ghi nhận thôi học hoặc để cán bộ tài chính xử lý hoàn/chuyển học phí trước",
    );
  }
}

export class KhoaDichKhongNhanHocVienError extends Error {
  constructor(lyDo: string) {
    super(`Khóa đích không nhận thêm học viên: ${lyDo}`);
  }
}

export class HoSoQuaDonViLienKetError extends Error {
  constructor() {
    super("Hồ sơ đăng ký qua đơn vị liên kết - xác nhận thu hồ sơ giấy theo lô ở DVLK-05");
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

// HV-08: vai trò Học viên chỉ "tự cập nhật thông tin cá nhân" của chính mình
export class NgoaiPhamViHoSoHocVienError extends Error {
  constructor(lyDo = "Học viên chỉ được xem/cập nhật hồ sơ của chính mình") {
    super(lyDo);
  }
}

export class CccdTrungError extends Error {
  constructor() {
    super("Số CCCD đã được dùng cho 1 học viên khác trong hệ thống");
  }
}

export class KhongTheXoaHocVienCoKetQuaError extends Error {
  constructor() {
    super("Học viên đã có điểm/chứng chỉ ở khóa này, không được xóa khỏi khóa");
  }
}

export class KhongPhaiTaiKhoanDonViLienKetError extends Error {
  constructor() {
    super("Tài khoản đăng nhập chưa được gán cho đơn vị liên kết nào");
  }
}

export class KhongCoHopDongLienKetHieuLucError extends Error {
  constructor() {
    super("Khóa này không có hợp đồng liên kết còn hiệu lực với đơn vị của bạn");
  }
}

export class DonViLienKetKhongHopLeChoKhoaError extends Error {
  constructor() {
    super("Đơn vị liên kết được chọn không có hợp đồng còn hiệu lực với khóa này");
  }
}

// (bổ sung 30/09/2026) form đăng ký cấu hình theo chương trình/khóa
export class CauHinhFormKhongHopLeError extends Error {
  constructor(chiTiet: string) {
    super(`Cấu hình form đăng ký không hợp lệ: ${chiTiet}`);
  }
}

export class ThongTinDangKyKhongHopLeError extends Error {
  constructor(chiTiet: string) {
    super(chiTiet);
  }
}

export class ThieuMinhChungBatBuocError extends Error {
  constructor(dsNhan: string[]) {
    super(`Hồ sơ thiếu minh chứng bắt buộc: ${dsNhan.join(", ")} - không thể đánh giá Hợp lệ`);
  }
}

export class KhongDuocXemTepHoSoError extends Error {
  constructor() {
    super("Không có quyền xem tệp minh chứng của hồ sơ này");
  }
}

// (bổ sung 01/10/2026) đăng ký dự thi bằng mã sinh viên (HV-05) + lệ phí thi
export class SinhVienKhongCoTrongDanhSachError extends Error {
  constructor() {
    super("Mã sinh viên không có trong danh sách sinh viên của nhà trường - vui lòng kiểm tra lại hoặc liên hệ phòng đào tạo");
  }
}

export class XacMinhSinhVienKhongKhopError extends Error {
  constructor() {
    super("4 số cuối CCCD không khớp với mã sinh viên trong danh sách của nhà trường");
  }
}

export class NopMinhChungLePhiError extends Error {
  constructor(lyDo: string) {
    super(`Không nộp được minh chứng chuyển khoản: ${lyDo}`);
  }
}

export class ChotDanhSachDuThiError extends Error {
  constructor(lyDo: string) {
    super(`Chưa chốt được danh sách chính thức: ${lyDo}`);
  }
}

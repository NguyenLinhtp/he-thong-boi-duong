/** Lớp cơ sở lỗi nghiệp vụ module DVLK - thông điệp an toàn để hiện cho người dùng. */
export class LoiDonViLienKet extends Error {}

export class ThieuThongTinDvlkError extends LoiDonViLienKet {
  constructor(truong: string) {
    super(`Thiếu thông tin bắt buộc: ${truong}`);
  }
}

export class MaDonViLienKetTrungError extends LoiDonViLienKet {
  constructor(ma: string) {
    super(`Mã đơn vị liên kết "${ma}" đã tồn tại`);
  }
}

export class KhongTimThayDonViLienKetError extends LoiDonViLienKet {
  constructor() {
    super("Không tìm thấy đơn vị liên kết");
  }
}

// DVLK-01: "không xóa được đơn vị đang có hợp đồng chưa thanh lý". Hợp đồng đã
// thanh lý vẫn là hồ sơ (học viên, chứng chỉ bàn giao tham chiếu tới) nên cũng
// không xóa được - chuyển Tạm ngừng hợp tác thay cho xóa.
export class DonViConHopDongError extends LoiDonViLienKet {
  constructor(soChuaThanhLy: number) {
    super(
      soChuaThanhLy > 0
        ? `Không xóa được: đơn vị đang có ${soChuaThanhLy} hợp đồng liên kết chưa thanh lý`
        : "Không xóa được: đơn vị đã có hợp đồng liên kết (hồ sơ lưu trữ) - hãy chuyển trạng thái Tạm ngừng hợp tác",
    );
  }
}

// DVLK-02
export class DonViDaCoTaiKhoanError extends LoiDonViLienKet {
  constructor() {
    super("Đơn vị liên kết đã có tài khoản - thu hồi tài khoản cũ trước khi cấp tài khoản mới");
  }
}

/** Lỗi chính sách tài khoản của QT-01 (tên đăng nhập trùng, mật khẩu yếu) khi cấp tài khoản DVLK. */
export class TaiKhoanKhongHopLeError extends LoiDonViLienKet {}

export class TaiKhoanKhongPhaiCanBoDonViLienKetError extends LoiDonViLienKet {
  constructor() {
    super("Tài khoản được chọn không có vai trò Cán bộ đơn vị liên kết");
  }
}

export class TaiKhoanDaGanDonViKhacError extends LoiDonViLienKet {
  constructor() {
    super("Tài khoản này đã gán cho 1 đơn vị liên kết khác");
  }
}

export class KhongPhaiTaiKhoanDvlkError extends LoiDonViLienKet {
  constructor() {
    super("Tài khoản chưa được gắn với đơn vị liên kết nào");
  }
}

// "không xem được dữ liệu của khóa/đơn vị khác" - không tiết lộ hợp đồng có tồn tại hay không
export class NgoaiPhamViDonViLienKetError extends LoiDonViLienKet {
  constructor() {
    super("Không tìm thấy hợp đồng liên kết trong phạm vi đơn vị của bạn");
  }
}

// DVLK-03
export class KhongTimThayKhoaDvlkError extends LoiDonViLienKet {
  constructor() {
    super("Không tìm thấy khóa bồi dưỡng");
  }
}

export class KhongTimThayHopDongDvlkError extends LoiDonViLienKet {
  constructor() {
    super("Không tìm thấy hợp đồng liên kết");
  }
}

export class DonViTamNgungError extends LoiDonViLienKet {
  constructor() {
    super("Đơn vị liên kết đang Tạm ngừng hợp tác - không lập được hợp đồng mới");
  }
}

// CT-07/DVLK-04: tuyển sinh qua đơn vị liên kết chỉ áp dụng cho khóa Phương thức 4
export class KhoaKhongQuaDonViLienKetError extends LoiDonViLienKet {
  constructor() {
    super("Khóa không thuộc chương trình Phương thức 4 (tuyển sinh qua đơn vị liên kết)");
  }
}

export class KhoaDaDongError extends LoiDonViLienKet {
  constructor() {
    super("Khóa đã kết thúc hoặc đã hủy - không lập hợp đồng liên kết mới");
  }
}

export class DaCoHopDongHieuLucError extends LoiDonViLienKet {
  constructor(maHopDong: string) {
    super(`Đơn vị đã có hợp đồng ${maHopDong} đang triển khai với khóa này`);
  }
}

export class HopDongDaThanhLyError extends LoiDonViLienKet {
  constructor() {
    super("Hợp đồng liên kết đã thanh lý - không chỉnh sửa được");
  }
}

export class SoLieuHopDongKhongHopLeError extends LoiDonViLienKet {
  constructor(chiTiet: string) {
    super(`Số liệu hợp đồng không hợp lệ: ${chiTiet}`);
  }
}

// DVLK-05
export class HoSoKhongChoThuError extends LoiDonViLienKet {
  constructor(dsHoSo: string[]) {
    super(`Hồ sơ không còn chờ đơn vị liên kết thu - không xác nhận lượt này: ${dsHoSo.join("; ")}`);
  }
}

// DVLK-06
export class ChuaPheDuyetKetQuaDvlkError extends LoiDonViLienKet {
  constructor() {
    super("Kết quả khóa chưa được phê duyệt (KQ-04) - chưa đối chiếu được số học viên hoàn thành để thanh lý");
  }
}

export class HopDongChuaThanhLyDvlkError extends LoiDonViLienKet {
  constructor() {
    super("Hợp đồng liên kết chưa thanh lý - chưa có biên bản thanh lý");
  }
}

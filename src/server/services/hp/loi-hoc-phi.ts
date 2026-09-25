export class KhongTimThayKhoaError extends Error {
  constructor() {
    super("Không tìm thấy khóa bồi dưỡng");
  }
}

export class KhongTimThayHocPhiError extends Error {
  constructor() {
    super("Không tìm thấy khoản học phí");
  }
}

// HP-01: "mức học phí không đổi sau khi khóa đã có học viên đăng ký, trừ khi
// có quyết định điều chỉnh".
export class ThieuLyDoDieuChinhHocPhiError extends Error {
  constructor() {
    super("Khóa đã có học viên đăng ký - cần nhập lý do quyết định điều chỉnh học phí");
  }
}

export class SoTienKhongHopLeError extends Error {
  constructor() {
    super("Số tiền nộp phải lớn hơn 0");
  }
}

// HP-02: HocPhi của học viên đăng ký qua đơn vị liên kết không thanh toán cá
// nhân qua đây - nghĩa vụ tài chính nằm ở hợp đồng liên kết (HP-06).
export class HocPhiQuaDonViLienKetError extends Error {
  constructor() {
    super("Học viên đăng ký qua đơn vị liên kết - nghĩa vụ tài chính theo hợp đồng liên kết, không xác nhận thanh toán cá nhân ở đây");
  }
}

export class ThieuLyDoBoQuaError extends Error {
  constructor() {
    super("Cần nhập lý do khi bỏ qua điều kiện học phí");
  }
}

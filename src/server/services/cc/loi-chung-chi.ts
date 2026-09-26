/** Lớp cơ sở lỗi nghiệp vụ module CC - thông điệp an toàn để hiện cho người dùng. */
export class LoiChungChi extends Error {}

export class KhongTimThayKhoaError extends LoiChungChi {
  constructor() {
    super("Không tìm thấy khóa bồi dưỡng");
  }
}

export class KhongTimThayChungChiError extends LoiChungChi {
  constructor() {
    super("Không tìm thấy chứng chỉ");
  }
}

// CC-01: căn cứ xét là kết quả cuối cùng đã được phê duyệt (KQ-04).
export class ChuaPheDuyetKetQuaError extends LoiChungChi {
  constructor() {
    super("Kết quả khóa chưa được phê duyệt (KQ-04) - chưa lập được danh sách đề nghị cấp chứng chỉ");
  }
}

export class SaiTrangThaiChungChiError extends LoiChungChi {
  constructor(canCo: string) {
    super(`Chứng chỉ không ở trạng thái phù hợp (cần: ${canCo})`);
  }
}

// CC-01/02/04: điều kiện có thể thay đổi sau khi lập đề nghị (vd phúc khảo
// KQ-04 hạ điểm) nên các bước sau kiểm tra lại, không tin kết quả cũ.
export class KhongConDuDieuKienError extends LoiChungChi {
  constructor(lyDo: string) {
    super(`Học viên không còn đủ điều kiện cấp chứng chỉ: ${lyDo}`);
  }
}

export class ThieuThongTinError extends LoiChungChi {
  constructor(truong: string) {
    super(`Thiếu thông tin bắt buộc: ${truong}`);
  }
}

// CC-04: "trao trực tiếp cho học viên tự đăng ký, hoặc bàn giao theo lô về
// đơn vị liên kết" - kênh phải khớp nguồn đăng ký.
export class SaiKenhNhanChungChiError extends LoiChungChi {
  constructor(laHocVienDvlk: boolean) {
    super(
      laHocVienDvlk
        ? "Học viên do đơn vị liên kết tuyển sinh - chứng chỉ chỉ bàn giao theo lô về đơn vị liên kết"
        : "Học viên tự đăng ký - chứng chỉ trao trực tiếp, không bàn giao qua đơn vị liên kết",
    );
  }
}

// CC-04: "chỉ bàn giao theo lô sau khi hợp đồng liên kết đã thanh lý".
export class HopDongChuaThanhLyError extends LoiChungChi {
  constructor() {
    super("Hợp đồng liên kết chưa thanh lý (DVLK-06) - chưa bàn giao chứng chỉ được");
  }
}

export class KhongTimThayHopDongError extends LoiChungChi {
  constructor() {
    super("Không tìm thấy hợp đồng liên kết");
  }
}

export class LoTrongError extends LoiChungChi {
  constructor() {
    super("Hợp đồng không có chứng chỉ nào đã ký duyệt đang chờ bàn giao");
  }
}

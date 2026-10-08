export class SaiTrangThaiChuongTrinhError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class KhongTimThayChuongTrinhError extends Error {
  constructor() {
    super("Không tìm thấy chương trình bồi dưỡng");
  }
}

export class KhongXoaDuocChuongTrinhError extends Error {
  constructor(lyDo: string) {
    super(`Không xóa được chương trình: ${lyDo}`);
  }
}

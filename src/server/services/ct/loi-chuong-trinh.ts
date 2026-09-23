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

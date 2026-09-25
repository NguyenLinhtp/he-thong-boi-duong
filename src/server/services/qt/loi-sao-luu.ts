export class KhongTimThayBanSaoLuuError extends Error {
  constructor() {
    super("Không tìm thấy bản sao lưu");
  }
}

export class BanSaoLuuChuaSanSangError extends Error {
  constructor() {
    super("Bản sao lưu chưa hoàn tất hoặc đã lỗi - không thể dùng để phục hồi");
  }
}

export class TepSaoLuuKhongHopLeError extends Error {
  constructor() {
    super("Tệp sao lưu bị hỏng hoặc không đúng định dạng");
  }
}

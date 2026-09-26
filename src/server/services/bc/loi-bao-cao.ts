/** Lớp cơ sở lỗi nghiệp vụ module BC - thông điệp an toàn để hiện cho người dùng. */
export class LoiBaoCao extends Error {}

export class KhoangNgayKhongHopLeError extends LoiBaoCao {
  constructor(chiTiet: string) {
    super(`Kỳ báo cáo không hợp lệ: ${chiTiet}`);
  }
}

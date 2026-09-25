import crypto from "node:crypto";

// Mã hóa 2 chiều (không phải hash 1 chiều như mật khẩu tài khoản) - dùng cho
// dữ liệu bắt buộc phải đọc lại nguyên văn để dùng (ví dụ mật khẩu SMTP để
// xác thực gửi email), khác với matKhauHash của NguoiDung chỉ cần so khớp.
const THUAT_TOAN = "aes-256-gcm";

export class ThieuKhoaMaHoaError extends Error {
  constructor() {
    super(
      "Chưa cấu hình biến môi trường CONFIG_ENCRYPT_KEY - không thể mã hóa/giải mã dữ liệu nhạy cảm",
    );
  }
}

function layKhoa(): Buffer {
  const khoa = process.env.CONFIG_ENCRYPT_KEY;
  if (!khoa) throw new ThieuKhoaMaHoaError();
  return crypto.createHash("sha256").update(khoa).digest();
}

// Chuỗi trả về: base64(iv) + "." + base64(authTag) + "." + base64(dữ liệu mã hóa)
export function maHoa(vanBanGoc: string): string {
  const khoa = layKhoa();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(THUAT_TOAN, khoa, iv);
  const maHoaXong = Buffer.concat([cipher.update(vanBanGoc, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), maHoaXong.toString("base64")].join(
    ".",
  );
}

export function giaiMa(vanBanMaHoa: string): string {
  const khoa = layKhoa();
  const [ivB64, authTagB64, duLieuB64] = vanBanMaHoa.split(".");
  const decipher = crypto.createDecipheriv(THUAT_TOAN, khoa, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const giaiMaXong = Buffer.concat([
    decipher.update(Buffer.from(duLieuB64, "base64")),
    decipher.final(),
  ]);
  return giaiMaXong.toString("utf8");
}

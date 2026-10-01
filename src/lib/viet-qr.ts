/**
 * (bổ sung 01/10/2026 - HV-05) Chuỗi mã QR chuyển khoản theo chuẩn VietQR
 * (EMVCo QR, dịch vụ NAPAS 247 "QRIBFTTA") - mọi ứng dụng ngân hàng tại Việt
 * Nam quét được, tự điền số tài khoản, số tiền, nội dung. Sinh tại chỗ, không
 * gọi dịch vụ bên ngoài.
 */

const truong = (id: string, giaTri: string) => `${id}${String(giaTri.length).padStart(2, "0")}${giaTri}`;

/** CRC-16/CCITT-FALSE (đa thức 0x1021, khởi tạo 0xFFFF) - checksum bắt buộc của EMVCo QR. */
export function crc16(chuoi: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(chuoi)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Nội dung chuyển khoản: bỏ dấu, chỉ chữ/số/khoảng trắng (nhiều ngân hàng không nhận ký tự khác). */
export function noiDungChuyenKhoan(s: string, toiDa = 50) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D"))
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, toiDa);
}

export function chuoiVietQR(tt: { maBin: string; soTaiKhoan: string; soTien?: number | null; noiDung?: string | null }) {
  const taiKhoan = truong("00", tt.maBin) + truong("01", tt.soTaiKhoan);
  const nhaCungCap = truong("00", "A000000727") + truong("01", taiKhoan) + truong("02", "QRIBFTTA");
  const coSoTien = tt.soTien != null && tt.soTien > 0;
  let s =
    truong("00", "01") +
    // 12 = mã QR động (có số tiền, dùng 1 lần), 11 = tĩnh
    truong("01", coSoTien ? "12" : "11") +
    truong("38", nhaCungCap) +
    truong("53", "704") +
    (coSoTien ? truong("54", String(Math.round(tt.soTien!))) : "") +
    truong("58", "VN");
  const noiDung = tt.noiDung ? noiDungChuyenKhoan(tt.noiDung, 25) : "";
  if (noiDung) s += truong("62", truong("08", noiDung));
  s += "6304";
  return s + crc16(s);
}

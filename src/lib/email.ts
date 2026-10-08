/**
 * (bổ sung 08/10/2026) Kiểm tra định dạng email dùng chung cho form đăng ký (HV-01/04/05/11/12),
 * đăng ký tài khoản (QT-01), điều chỉnh/sửa hồ sơ (HV-06/HV-08). Module thuần - dùng được ở trình
 * duyệt (báo lỗi ngay khi nhập) và máy chủ (chặn khi lưu).
 *
 * Hợp lệ: phần tên gồm chữ không dấu, số và . _ % + - (không bắt đầu/kết thúc bằng dấu chấm, không
 * có 2 dấu chấm liền nhau); tên miền gồm các nhãn chữ/số/gạch nối (không bắt đầu/kết thúc bằng gạch
 * nối) ngăn bởi dấu chấm, đuôi cuối tối thiểu 2 chữ cái. Tối đa 254 ký tự, phần tên tối đa 64.
 * Ví dụ bị chặn: "ten@gmail", "ten@gmail..com", "ten@gmail,com", "tên@gmail.com", "ten@@gmail.com",
 * "ten@gmail.c", ".ten@gmail.com", "ten gmail@gmail.com".
 */
const EMAIL = /^[A-Za-z0-9_%+-]+(\.[A-Za-z0-9_%+-]+)*@([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

/** Mẫu cho thuộc tính pattern của ô nhập (trình duyệt chặn sớm; máy chủ vẫn kiểm tra đầy đủ). */
export const MAU_EMAIL_HTML = "[A-Za-z0-9_%+\\-]+(\\.[A-Za-z0-9_%+\\-]+)*@([A-Za-z0-9]([A-Za-z0-9\\-]*[A-Za-z0-9])?\\.)+[A-Za-z]{2,}";

export const GOI_Y_EMAIL = "Email chưa đúng định dạng, ví dụ: ten@gmail.com";

/** Bỏ khoảng trắng 2 đầu, viết thường. */
export const chuanHoaEmail = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export function laEmailHopLe(s: string | null | undefined): boolean {
  const e = chuanHoaEmail(s);
  return e.length <= 254 && e.indexOf("@") <= 64 && EMAIL.test(e);
}

/** Trường tùy chỉnh của form đăng ký là email nếu tên có chữ "email"/"thư điện tử". */
export const laNhanEmail = (nhan: string) => /e-?mail|thư điện tử/i.test(nhan);

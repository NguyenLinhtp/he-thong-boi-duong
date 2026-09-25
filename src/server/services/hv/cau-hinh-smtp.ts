import { prisma } from "@/lib/db/prisma";
import { maHoa, giaiMa } from "@/lib/crypto/ma-hoa";

export class ThieuMatKhauSmtpError extends Error {
  constructor() {
    super("Chưa từng cấu hình SMTP - bắt buộc nhập mật khẩu ở lần lưu đầu tiên");
  }
}

export type LuuCauHinhSmtpInput = {
  host: string;
  port: number;
  taiKhoan: string;
  matKhau: string;
  tuDiaChi: string;
};

// Dùng cho UI admin - không bao giờ trả mật khẩu thật về trình duyệt, chỉ
// báo đã cấu hình hay chưa.
export async function layCauHinhSmtpHienThi() {
  const cauHinh = await prisma.cauHinhSmtp.findFirst();
  if (!cauHinh) return null;
  return {
    host: cauHinh.host,
    port: cauHinh.port,
    taiKhoan: cauHinh.taiKhoan,
    tuDiaChi: cauHinh.tuDiaChi,
    capNhatLuc: cauHinh.capNhatLuc,
  };
}

// Chỉ dùng nội bộ server khi thực sự cần gửi email (hv-10-thong-bao.ts) -
// không export ra route/action cho client.
export async function layCauHinhSmtpNoiBo() {
  const cauHinh = await prisma.cauHinhSmtp.findFirst();
  if (!cauHinh) return null;
  return {
    host: cauHinh.host,
    port: cauHinh.port,
    taiKhoan: cauHinh.taiKhoan,
    matKhau: giaiMa(cauHinh.matKhauMaHoa),
    tuDiaChi: cauHinh.tuDiaChi,
  };
}

// SMTP chỉ có đúng 1 cấu hình dùng chung toàn hệ thống (singleton) - lưu đè
// lên dòng duy nhất đã có, hoặc tạo mới nếu chưa từng cấu hình. Để trống
// matKhau khi đã có cấu hình cũ nghĩa là "giữ nguyên mật khẩu hiện tại" -
// form không hiển thị lại mật khẩu thật nên không thể so sánh "có đổi hay
// không" theo cách nào khác.
export async function luuCauHinhSmtp(input: LuuCauHinhSmtpInput) {
  const hienCo = await prisma.cauHinhSmtp.findFirst();
  const data = {
    host: input.host,
    port: input.port,
    taiKhoan: input.taiKhoan,
    tuDiaChi: input.tuDiaChi,
    ...(input.matKhau ? { matKhauMaHoa: maHoa(input.matKhau) } : {}),
  };

  if (hienCo) {
    return prisma.cauHinhSmtp.update({ where: { id: hienCo.id }, data });
  }
  if (!input.matKhau) throw new ThieuMatKhauSmtpError();
  return prisma.cauHinhSmtp.create({ data: { ...data, matKhauMaHoa: maHoa(input.matKhau) } });
}

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export type DanhTinhToiThieu = { id: string; name: string };

/**
 * Đăng nhập đa kênh: tài khoản cán bộ dùng tên đăng nhập; học viên qua
 * Phương thức 2 (import + tự xác nhận) có thể dùng CCCD hoặc mã số học viên.
 * Tách khỏi Credentials provider để test được trực tiếp, không cần request
 * context của NextAuth.
 */
export async function xacThucDangNhap(
  dinhDanh: string,
  matKhau: string,
): Promise<DanhTinhToiThieu | null> {
  const nguoiDung = await prisma.nguoiDung.findFirst({
    where: {
      OR: [{ tenDangNhap: dinhDanh }, { soCCCD: dinhDanh }, { maSoHocVien: dinhDanh }],
    },
  });

  if (!nguoiDung || nguoiDung.trangThai === "TAM_KHOA") return null;

  const khopMatKhau = await bcrypt.compare(matKhau, nguoiDung.matKhauHash);
  if (!khopMatKhau) return null;

  return { id: nguoiDung.id, name: nguoiDung.hoTen };
}

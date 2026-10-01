"use server";

import { signIn } from "@/lib/auth";
import { dangKyTaiKhoanHocVien } from "@/server/services/qt/qt-01-tu-dang-ky";

// chỉ chuyển về đường dẫn nội bộ (chặn open redirect qua callbackUrl)
const duongDanNoiBo = (s: unknown) => (typeof s === "string" && s.startsWith("/") && !s.startsWith("//") ? s : "/");

// (bổ sung 01/10/2026 - QT-01) học viên tự đăng ký tài khoản, xong thì đăng nhập luôn
export async function dangKyTaiKhoanAction(_prev: string | undefined, formData: FormData): Promise<string | undefined> {
  const soCCCD = String(formData.get("soCCCD") ?? "");
  const matKhau = String(formData.get("matKhau") ?? "");
  try {
    await dangKyTaiKhoanHocVien({
      hoTen: String(formData.get("hoTen") ?? ""),
      soCCCD,
      ngaySinh: String(formData.get("ngaySinh") ?? ""),
      soDienThoai: String(formData.get("soDienThoai") ?? ""),
      email: String(formData.get("email") ?? ""),
      matKhau,
      nhapLaiMatKhau: String(formData.get("nhapLaiMatKhau") ?? ""),
    });
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }
  await signIn("credentials", { dinhDanh: soCCCD.trim(), matKhau, redirectTo: duongDanNoiBo(formData.get("callbackUrl")) });
}

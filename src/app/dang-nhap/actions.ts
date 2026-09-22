"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export async function dangNhap(_prevState: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      dinhDanh: formData.get("dinhDanh"),
      matKhau: formData.get("matKhau"),
      redirectTo: (formData.get("callbackUrl") as string) || "/quan-tri/tai-khoan",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Sai tên đăng nhập/CCCD/mã số hoặc mật khẩu.";
    }
    throw error;
  }
}

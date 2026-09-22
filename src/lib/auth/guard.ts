import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { PhienDangNhap } from "@/lib/auth/permissions";
import { kiemTraQuyen, ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";

export { KhongCoQuyenError, ChuaDangNhapError };

/**
 * Điểm kiểm tra quyền tập trung duy nhất cho mọi API route/server action.
 * Không tự viết check rải rác theo vai trò ở từng handler - luôn gọi hàm này
 * với đúng mã chức năng (maCN) của route đó.
 */
export async function requirePermission(maCN: string): Promise<PhienDangNhap> {
  const session = await auth();
  return kiemTraQuyen(session?.phienDangNhap, maCN);
}

/**
 * Bọc quanh mọi route handler API để chuẩn hóa lỗi 401/403 từ
 * requirePermission() thành response JSON - tránh mỗi route tự viết
 * try/catch riêng, chỉ cần khai báo 1 lần ở đây.
 */
export function apiRoute<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ChuaDangNhapError || error instanceof KhongCoQuyenError) {
        return NextResponse.json({ message: error.message }, { status: error.status });
      }
      throw error;
    }
  };
}

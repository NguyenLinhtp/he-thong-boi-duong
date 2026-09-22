import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Chặn ở tầng proxy (chạy runtime Node.js - cần truy vấn DB qua auth()):
// chỉ đảm bảo "đã đăng nhập chưa". Kiểm tra đúng mã chức năng (maCN) cụ thể
// của từng route thuộc về requirePermission() ở tầng route handler/server
// action - proxy không có đủ ngữ cảnh để biết maCN.
export default auth((req) => {
  const daDangNhap = Boolean(req.auth?.phienDangNhap);
  if (!daDangNhap) {
    const url = new URL("/dang-nhap", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

// (dashboard) là route group của Next.js - không xuất hiện trong URL thật,
// nên phải liệt kê đúng tiền tố URL của từng module theo cấu trúc trong CLAUDE.md.
export const config = {
  matcher: [
    "/danh-muc/:path*",
    "/chuong-trinh/:path*",
    "/khoa-hoc/:path*",
    "/tuyen-sinh/:path*",
    "/giang-day/:path*",
    "/ket-qua/:path*",
    "/hoc-phi/:path*",
    "/chung-chi/:path*",
    "/bao-cao/:path*",
    "/quan-tri/:path*",
    "/don-vi-lien-ket/:path*",
  ],
};

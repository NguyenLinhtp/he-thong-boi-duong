import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { xacThucDangNhap } from "@/lib/auth/xac-thuc";
import { layPhienDangNhap, type PhienDangNhap } from "@/lib/auth/permissions";

declare module "next-auth" {
  interface Session {
    phienDangNhap: PhienDangNhap;
  }
}

type TokenVoiPhien = { phienDangNhap?: PhienDangNhap };

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/dang-nhap" },
  providers: [
    Credentials({
      credentials: {
        dinhDanh: { label: "Tên đăng nhập / CCCD / Mã số" },
        matKhau: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        const dinhDanh = credentials?.dinhDanh;
        const matKhau = credentials?.matKhau;
        if (typeof dinhDanh !== "string" || typeof matKhau !== "string") {
          return null;
        }
        return xacThucDangNhap(dinhDanh, matKhau);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Chỉ tra lại quyền từ DB lúc đăng nhập; đổi quyền (QT-02) có hiệu lực
      // từ lần đăng nhập kế tiếp, không thu hồi phiên đang hoạt động ngay lập tức.
      const t = token as typeof token & TokenVoiPhien;
      if (user?.id) {
        const phienDangNhap = await layPhienDangNhap(user.id);
        if (phienDangNhap) t.phienDangNhap = phienDangNhap;
      }
      return t;
    },
    async session({ session, token }) {
      const t = token as typeof token & TokenVoiPhien;
      if (t.phienDangNhap) session.phienDangNhap = t.phienDangNhap;
      return session;
    },
  },
};

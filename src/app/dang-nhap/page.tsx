import type { Metadata } from "next";
import { Suspense } from "react";
import { ChanTrangCongKhai, DauTrangCongKhai } from "@/components/layout/dau-trang-cong-khai";
import { FormDangNhap } from "./form-dang-nhap";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function DangNhapPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DauTrangCongKhai />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-ued-blue-dam px-4 py-12">
        {/* nền: dải xanh UED chéo nhẹ thay cho ảnh */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, #1e73be 0, transparent 45%), radial-gradient(circle at 85% 80%, #054fa8 0, transparent 50%)",
          }}
        />
        <div className="relative w-full max-w-md rounded-lg bg-white px-8 py-10 shadow-2xl">
          <h1 className="text-center text-xl leading-snug font-bold text-ued-blue-dam uppercase">
            Đăng nhập
            <br />
            <span className="text-base">Hệ thống quản lý bồi dưỡng</span>
          </h1>
          <p className="mt-1 mb-6 text-center text-sm text-muted-foreground">Trường Đại học Sư phạm - ĐHĐN</p>
          <Suspense>
            <FormDangNhap />
          </Suspense>
        </div>
      </main>
      <ChanTrangCongKhai />
    </div>
  );
}

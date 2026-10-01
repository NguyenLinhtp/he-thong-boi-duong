import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ChanTrangCongKhai, DauTrangCongKhai } from "@/components/layout/dau-trang-cong-khai";
import { FormDangKyTaiKhoan } from "./form-dang-ky-tai-khoan";

export const metadata: Metadata = { title: "Đăng ký tài khoản học viên" };

// (bổ sung 01/10/2026 - QT-01) học viên tự đăng ký tài khoản để đăng ký khóa bồi dưỡng
export default async function DangKyTaiKhoanPage() {
  if ((await auth())?.phienDangNhap) redirect("/");
  return (
    <div className="flex min-h-screen flex-col">
      <DauTrangCongKhai />
      <main className="flex flex-1 items-start justify-center bg-muted/40 px-4 py-10">
        <div className="w-full max-w-xl rounded-lg border bg-card px-6 py-8 shadow-md sm:px-8">
          <h1 className="text-center text-xl font-bold text-ued-blue-dam uppercase">Đăng ký tài khoản học viên</h1>
          <p className="mt-1 mb-6 text-center text-sm text-muted-foreground">
            Dùng để đăng ký các khóa bồi dưỡng, học trực tuyến, xem kết quả. Đăng ký dự thi không cần tài khoản.
            Nếu đã từng học tại trung tâm, nhập đúng họ tên và ngày sinh như hồ sơ cũ để nhận lại hồ sơ.
          </p>
          <Suspense>
            <FormDangKyTaiKhoan />
          </Suspense>
        </div>
      </main>
      <ChanTrangCongKhai />
    </div>
  );
}

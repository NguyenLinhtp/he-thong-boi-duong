import { Suspense } from "react";
import { FormDangNhap } from "./form-dang-nhap";

export default function DangNhapPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-lg font-semibold">Đăng nhập hệ thống bồi dưỡng</h1>
      <Suspense>
        <FormDangNhap />
      </Suspense>
    </main>
  );
}

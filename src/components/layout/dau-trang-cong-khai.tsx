import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";

// Đầu trang các trang công khai (trang chủ, đăng nhập, đăng ký theo khóa, tra cứu văn bằng)
export async function DauTrangCongKhai() {
  const phien = (await auth())?.phienDangNhap;
  return (
    <header className="border-b bg-white print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Trang chủ">
          <Image src="/logo-ued.png" alt="Trường Đại học Sư phạm - ĐHĐN" width={193} height={40} priority />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dang-ky" className="hidden text-ued-blue hover:underline sm:inline">
            Chương trình
          </Link>
          <Link href="/xac-thuc-van-bang" className="hidden text-ued-blue hover:underline md:inline">
            Tra cứu văn bằng
          </Link>
          {phien ? (
            <Link href="/" className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90">
              Vào hệ thống
            </Link>
          ) : (
            <>
              <Link href="/dang-ky-tai-khoan" className="text-ued-blue hover:underline">
                Đăng ký tài khoản
              </Link>
              <Link href="/dang-nhap" className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90">
                Đăng nhập
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function ChanTrangCongKhai() {
  return (
    <footer className="bg-ued-blue-dam py-3 text-center text-xs text-white/85 print:hidden">
      © Trường Đại học Sư phạm - Đại học Đà Nẵng
    </footer>
  );
}

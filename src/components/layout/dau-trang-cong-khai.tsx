import Image from "next/image";
import Link from "next/link";

// Đầu trang các trang công khai (đăng nhập, đăng ký theo khóa, tra cứu văn bằng)
export function DauTrangCongKhai() {
  return (
    <header className="border-b bg-white print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Trang chủ">
          <Image src="/logo-ued.png" alt="Trường Đại học Sư phạm - ĐHĐN" width={193} height={40} priority />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/xac-thuc-van-bang" className="text-ued-blue hover:underline">
            Tra cứu văn bằng
          </Link>
          <a href="https://crdc.ued.udn.vn" className="hidden text-ued-blue hover:underline sm:inline">
            Trung tâm bồi dưỡng
          </a>
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

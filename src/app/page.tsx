import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, LogIn } from "lucide-react";
import { auth } from "@/lib/auth";
import { menuTheoQuyen, trangMacDinh } from "@/components/layout/menu";
import { ChanTrangCongKhai, DauTrangCongKhai } from "@/components/layout/dau-trang-cong-khai";

// Trang gốc: đã đăng nhập thì vào màn hình đầu tiên được phép (dashboard nếu có
// BC-01); chưa đăng nhập thì là trang giới thiệu với 2 lối vào công khai.
export default async function TrangChu() {
  const phien = (await auth())?.phienDangNhap;
  if (phien) {
    const dich = trangMacDinh(menuTheoQuyen(phien));
    if (dich) redirect(dich);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DauTrangCongKhai />
      <main className="flex-1">
        <section className="bg-ued-blue-dam text-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <p className="text-sm font-medium tracking-wide text-ued-vang uppercase">Trường Đại học Sư phạm - ĐHĐN</p>
            <h1 className="mt-2 max-w-2xl text-3xl leading-tight font-bold md:text-4xl">
              Hệ thống quản lý đào tạo bồi dưỡng
            </h1>
            <p className="mt-4 max-w-2xl text-white/85">
              Quản lý chương trình, khóa bồi dưỡng, tuyển sinh, giảng dạy, học phí, kết quả và cấp chứng chỉ trên
              một hệ thống thống nhất.
            </p>
          </div>
        </section>
        <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-2">
          {phien ? (
            <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground md:col-span-2">
              Tài khoản của bạn chưa được phân quyền chức năng nào. Vui lòng liên hệ quản trị hệ thống.
            </p>
          ) : (
            <Link
              href="/dang-nhap"
              className="group flex gap-4 rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <LogIn className="size-10 shrink-0 text-primary" />
              <span>
                <span className="block text-lg font-bold text-ued-blue-dam group-hover:underline">Đăng nhập</span>
                <span className="text-sm text-muted-foreground">
                  Cán bộ, giảng viên, học viên và đơn vị liên kết đăng nhập bằng tài khoản được cấp.
                </span>
              </span>
            </Link>
          )}
          <Link
            href="/xac-thuc-van-bang"
            className="group flex gap-4 rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <BadgeCheck className="size-10 shrink-0 text-success" />
            <span>
              <span className="block text-lg font-bold text-ued-blue-dam group-hover:underline">
                Tra cứu, xác thực văn bằng
              </span>
              <span className="text-sm text-muted-foreground">
                Kiểm tra chứng chỉ, giấy chứng nhận bồi dưỡng theo số hiệu và họ tên, hoặc quét mã QR.
              </span>
            </span>
          </Link>
        </section>
      </main>
      <ChanTrangCongKhai />
    </div>
  );
}

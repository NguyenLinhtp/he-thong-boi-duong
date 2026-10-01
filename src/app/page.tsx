import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, LogIn, UserPlus } from "lucide-react";
import { auth } from "@/lib/auth";
import { menuTheoQuyen, trangMacDinh } from "@/components/layout/menu";
import { ChanTrangCongKhai, DauTrangCongKhai } from "@/components/layout/dau-trang-cong-khai";
import { DanhMucChuongTrinh } from "@/components/cong-khai/danh-muc-chuong-trinh";

// Trang gốc: đã đăng nhập thì vào màn hình đầu tiên được phép; chưa đăng nhập thì
// (bổ sung 01/10/2026) là danh mục chương trình đang mở đăng ký dạng khối.
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
          <div className="mx-auto max-w-6xl px-4 py-12">
            <p className="text-sm font-medium tracking-wide text-ued-vang uppercase">Trường Đại học Sư phạm - ĐHĐN</p>
            <h1 className="mt-2 max-w-3xl text-3xl leading-tight font-bold text-balance md:text-4xl">
              Đăng ký bồi dưỡng và dự thi trực tuyến
            </h1>
            <p className="mt-3 max-w-2xl text-white/85">
              Chọn chương trình bên dưới để xem các khóa, đợt thi đang mở. Đăng ký dự thi không cần tài khoản; khóa bồi dưỡng
              cần tài khoản học viên để học tập trực tuyến.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-10">
          {phien ? (
            <p className="mb-8 rounded-lg border bg-card p-6 text-sm text-muted-foreground">
              Tài khoản của bạn chưa được phân quyền chức năng nào. Vui lòng liên hệ quản trị hệ thống.
            </p>
          ) : null}
          <DanhMucChuongTrinh />

          <section className="mt-12 grid gap-4 md:grid-cols-3">
            {!phien && (
              <>
                <Link href="/dang-ky-tai-khoan" className="group flex gap-4 rounded-lg border bg-card p-5 shadow-sm hover:shadow-md">
                  <UserPlus className="size-8 shrink-0 text-primary" />
                  <span>
                    <span className="block font-bold text-ued-blue-dam group-hover:underline">Đăng ký tài khoản học viên</span>
                    <span className="text-sm text-muted-foreground">Dùng số CCCD làm tên đăng nhập, để đăng ký các khóa bồi dưỡng.</span>
                  </span>
                </Link>
                <Link href="/dang-nhap" className="group flex gap-4 rounded-lg border bg-card p-5 shadow-sm hover:shadow-md">
                  <LogIn className="size-8 shrink-0 text-primary" />
                  <span>
                    <span className="block font-bold text-ued-blue-dam group-hover:underline">Đăng nhập</span>
                    <span className="text-sm text-muted-foreground">Học viên, cán bộ, giảng viên và đơn vị liên kết.</span>
                  </span>
                </Link>
              </>
            )}
            <Link href="/xac-thuc-van-bang" className="group flex gap-4 rounded-lg border bg-card p-5 shadow-sm hover:shadow-md">
              <BadgeCheck className="size-8 shrink-0 text-success" />
              <span>
                <span className="block font-bold text-ued-blue-dam group-hover:underline">Tra cứu, xác thực văn bằng</span>
                <span className="text-sm text-muted-foreground">Theo số hiệu và họ tên, hoặc quét mã QR.</span>
              </span>
            </Link>
          </section>
        </div>
      </main>
      <ChanTrangCongKhai />
    </div>
  );
}

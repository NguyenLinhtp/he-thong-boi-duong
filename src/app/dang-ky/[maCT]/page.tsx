import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Info } from "lucide-react";
import { chuongTrinhCongKhai } from "@/server/services/kh/kh-06-danh-muc-cong-khai";
import { auth } from "@/lib/auth";
import { dinhDangNgay, dinhDangTien } from "@/lib/dinh-dang";

// (bổ sung 01/10/2026 - KH-06) trang chương trình công khai: giới thiệu + các khóa/đợt thi đang mở đăng ký
export default async function TrangChuongTrinhCongKhai({ params }: { params: Promise<{ maCT: string }> }) {
  const { maCT } = await params;
  const du = await chuongTrinhCongKhai(maCT);
  if (!du) notFound();
  const { ct, laDuThi, canTaiKhoan, dsKhoa } = du;
  const daDangNhap = Boolean((await auth())?.phienDangNhap);

  return (
    <main>
      <section className="bg-ued-blue-dam text-white">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <Link href="/" className="text-sm text-white/75 hover:underline">
            ← Tất cả chương trình
          </Link>
          <p className="mt-3 text-sm font-medium tracking-wide text-ued-vang uppercase">{ct.loaiHinhBoiDuong.ten}</p>
          <h1 className="mt-1 text-2xl leading-tight font-bold text-balance md:text-3xl">{ct.ten}</h1>
          {ct.mucTieu && <p className="mt-3 text-white/85">{ct.mucTieu}</p>}
          {ct.doiTuongApDung && <p className="mt-1 text-sm text-white/75">Đối tượng: {ct.doiTuongApDung}</p>}
        </div>
      </section>

      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8">
        <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          {canTaiKhoan ? (
            <span>
              Khóa bồi dưỡng cần <b>tài khoản học viên</b> để đăng ký và học tập trực tuyến.{" "}
              {!daDangNhap && (
                <>
                  Chưa có tài khoản?{" "}
                  <Link href={`/dang-ky-tai-khoan?callbackUrl=/dang-ky/${ct.maCT}`} className="font-medium underline">
                    Đăng ký tài khoản
                  </Link>{" "}
                  (dùng số CCCD làm tên đăng nhập).
                </>
              )}
            </span>
          ) : (
            <span>
              Đăng ký dự thi <b>không cần tài khoản</b>. Sau khi đăng ký, bạn in đơn, chuyển khoản lệ phí và nộp minh chứng; muốn
              xem lại đơn chỉ cần xác nhận 4 số cuối CCCD.
            </span>
          )}
        </p>

        <h2 className="text-lg font-bold text-ued-blue-dam">{laDuThi ? "Các đợt thi đang mở đăng ký" : "Các khóa đang mở đăng ký"}</h2>
        {dsKhoa.length === 0 ? (
          <p className="rounded-lg border bg-card p-6 text-muted-foreground">Chương trình hiện không có khóa nào mở đăng ký.</p>
        ) : (
          dsKhoa.map((k) => (
            <Link
              key={k.maKhoa}
              href={`/khoa/${k.maKhoa}`}
              className="group grid gap-3 rounded-lg border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Mã {laDuThi ? "đợt thi" : "khóa"}</p>
                  <p className="font-bold text-ued-blue-dam">{k.maKhoa}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{laDuThi ? "Ngày thi" : "Khai giảng - bế giảng"}</p>
                  <p className="font-semibold">
                    {laDuThi ? dinhDangNgay(k.khaiGiang, "Thông báo sau") : `${dinhDangNgay(k.khaiGiang)} - ${dinhDangNgay(k.beGiang)}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hạn đăng ký</p>
                  <p className="font-semibold">{dinhDangNgay(k.hanDangKy, "Đến khi đủ chỗ")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{laDuThi ? "Lệ phí" : "Học phí"} · còn chỗ</p>
                  <p className="font-semibold">
                    {dinhDangTien(k.mucHocPhi, "Liên hệ")} · {k.conCho}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground group-hover:bg-primary/90">
                {laDuThi ? "Đăng ký dự thi" : "Đăng ký"} <ArrowRight className="size-4" />
              </span>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}

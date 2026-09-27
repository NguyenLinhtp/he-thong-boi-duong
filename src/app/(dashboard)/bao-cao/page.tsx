import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { tongQuanDashboard } from "@/server/services/bc/bc-01-dashboard";
import { TuLamMoi } from "./tu-lam-moi";

const tien = (so: number) => `${so.toLocaleString("vi-VN")} đ`;

function The({ nhan, giaTri, phu, href }: { nhan: string; giaTri: string | number; phu?: string; href?: string }) {
  const noiDung = (
    <>
      <p className="text-xs text-muted-foreground">{nhan}</p>
      <p className="text-2xl font-semibold">{giaTri}</p>
      {phu && <p className="text-xs text-muted-foreground">{phu}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="rounded-lg border p-3 hover:bg-muted">
      {noiDung}
    </Link>
  ) : (
    <div className="rounded-lg border p-3">{noiDung}</div>
  );
}

// BC-01: dashboard tổng quan - số liệu tính trực tiếp, trang tự làm mới mỗi 60 giây
export default async function DashboardPage() {
  try {
    await requirePermission("BC-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const d = await tongQuanDashboard();
  const thuCaoNhat = Math.max(1, ...d.hocPhi.thuTheoThang.map((t) => t.soTien));

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">BC-01 · Tổng quan hoạt động bồi dưỡng</h1>
        <TuLamMoi capNhatLuc={d.capNhatLuc.toISOString()} />
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <The
          nhan="Khóa đang mở"
          giaTri={d.khoa.dangMo}
          phu={`${d.khoa.chuanBi} chuẩn bị · ${d.khoa.dangTuyenSinh} tuyển sinh · ${d.khoa.dangHoc} đang học`}
        />
        <The nhan="Học viên đang học" giaTri={d.hocVien.dangHoc} phu={`${d.hocVien.hoSoMoi30Ngay} hồ sơ mới trong 30 ngày`} />
        <The nhan="Hồ sơ chờ xử lý" giaTri={d.hocVien.hoSoChoXuLy} phu="nộp giấy / xác nhận / thẩm định / duyệt" />
        <The
          nhan="Tiến độ giảng dạy"
          giaTri={d.giangDay.phanTram === null ? "—" : `${d.giangDay.phanTram}%`}
          phu={`${d.giangDay.daHoc}/${d.giangDay.tongBuoi} buổi của các khóa đang học`}
        />
        <The nhan="Thu học phí tháng này" giaTri={tien(d.hocPhi.thuThangNay)} href="/bao-cao/tai-chinh" />
        <The
          nhan="Công nợ học phí"
          giaTri={tien(d.hocPhi.congNo)}
          phu={`${d.hocPhi.soHocVienConNo} học viên`}
          href="/bao-cao/tai-chinh"
        />
        <The nhan="Tỷ lệ thu (lũy kế)" giaTri={d.hocPhi.tyLeThu === null ? "—" : `${d.hocPhi.tyLeThu.toLocaleString("vi-VN")}%`} phu="đã thu / phải thu cá nhân" />
        <The
          nhan="Văn bằng đã cấp năm nay"
          giaTri={d.vanBang.daCapNamNay}
          phu={`chờ cấp số ${d.vanBang.choCapSo} · chờ ký ${d.vanBang.choKy} · chờ trả ${d.vanBang.choTra}`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-2 rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Thu học phí 6 tháng gần nhất</h2>
          <div className="flex h-40 items-end gap-3">
            {d.hocPhi.thuTheoThang.map((t) => (
              <div key={t.thang} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">
                  {t.soTien ? `${(t.soTien / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr` : ""}
                </span>
                <div
                  className="w-full rounded-t bg-primary"
                  style={{ height: `${Math.max(2, (t.soTien / thuCaoNhat) * 100)}%` }}
                  title={tien(t.soTien)}
                />
                <span className="text-xs text-muted-foreground">{t.thang}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Tiến độ các khóa đang học</h2>
          {d.giangDay.theoKhoa.length === 0 && <p className="text-sm text-muted-foreground">Không có khóa đang học.</p>}
          <ul className="flex flex-col gap-2">
            {d.giangDay.theoKhoa.map((k) => (
              <li key={k.khoaId} className="text-sm">
                <div className="flex justify-between gap-2">
                  <Link href={`/khoa-hoc/${k.khoaId}`} className="truncate underline">
                    {k.maKhoa} · {k.tenChuongTrinh}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {k.daHoc}/{k.tongBuoi} buổi · {k.soHocVien} HV
                  </span>
                </div>
                <div className="mt-1 h-2 rounded bg-muted">
                  <div className="h-2 rounded bg-primary" style={{ width: `${k.phanTram ?? 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="flex flex-wrap gap-3 text-sm">
        <Link href="/bao-cao/dao-tao" className="underline">
          BC-02 Báo cáo hoạt động đào tạo
        </Link>
        <Link href="/bao-cao/tai-chinh" className="underline">
          BC-03 Báo cáo tài chính học phí
        </Link>
        <Link href="/bao-cao/mau-bieu" className="underline">
          BC-04 Báo cáo theo mẫu gửi cấp trên
        </Link>
        <Link href="/bao-cao/ho-so-luu-tru" className="underline">
          BC-05 Tra cứu hồ sơ lưu trữ
        </Link>
      </section>
    </main>
  );
}

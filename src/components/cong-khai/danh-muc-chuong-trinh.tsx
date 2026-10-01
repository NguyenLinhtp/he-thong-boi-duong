import Link from "next/link";
import { ArrowRight, CalendarClock, ClipboardCheck, GraduationCap, UserRoundCheck } from "lucide-react";
import { chuongTrinhDangMoDangKy } from "@/server/services/kh/kh-06-danh-muc-cong-khai";
import { dinhDangNgay, dinhDangTien } from "@/lib/dinh-dang";

type MucChuongTrinh = Awaited<ReturnType<typeof chuongTrinhDangMoDangKy>>[number];

function KhoiChuongTrinh({ ct }: { ct: MucChuongTrinh }) {
  const Icon = ct.laDuThi ? ClipboardCheck : GraduationCap;
  return (
    <Link
      href={`/dang-ky/${ct.maCT}`}
      className="group flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <span className={`rounded-lg p-2 ${ct.laDuThi ? "bg-ued-vang/20 text-ued-blue-dam" : "bg-primary/10 text-primary"}`}>
          <Icon className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase">{ct.loaiHinh}</p>
          <h3 className="leading-snug font-bold text-balance text-ued-blue-dam group-hover:underline">{ct.ten}</h3>
        </div>
      </div>
      {ct.mucTieu && <p className="line-clamp-2 text-sm text-muted-foreground">{ct.mucTieu}</p>}
      <dl className="mt-auto grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{ct.laDuThi ? "Lệ phí" : "Học phí"}</dt>
          <dd className="font-semibold">{ct.phiThapNhat === null ? "Liên hệ" : `${ct.soKhoa > 1 ? "từ " : ""}${dinhDangTien(ct.phiThapNhat)}`}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Hạn đăng ký</dt>
          <dd className="flex items-center gap-1 font-semibold">
            <CalendarClock className="size-3.5" />
            {dinhDangNgay(ct.hanGanNhat, "Đang mở")}
          </dd>
        </div>
      </dl>
      <div className="flex items-center justify-between border-t pt-3 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <UserRoundCheck className="size-3.5" />
          {ct.canTaiKhoan ? "Cần tài khoản học viên" : "Không cần tài khoản"}
        </span>
        <span className="flex items-center gap-1 font-medium text-primary">
          {ct.soKhoa} {ct.laDuThi ? "đợt thi" : "khóa"} đang mở <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/** (bổ sung 01/10/2026 - KH-06) danh mục chương trình đang mở đăng ký, dạng khối, chia nhóm dự thi / khóa học. */
export async function DanhMucChuongTrinh() {
  const ds = await chuongTrinhDangMoDangKy();
  const nhom = [
    { tieuDe: "Đăng ký dự thi", moTa: "Không cần tài khoản - đăng ký, in đơn, nộp lệ phí trực tuyến.", ds: ds.filter((c) => c.laDuThi) },
    { tieuDe: "Khóa bồi dưỡng", moTa: "Cần tài khoản học viên để đăng ký và học tập trực tuyến.", ds: ds.filter((c) => !c.laDuThi) },
  ].filter((n) => n.ds.length > 0);

  if (nhom.length === 0) {
    return <p className="rounded-lg border bg-card p-6 text-center text-muted-foreground">Hiện chưa có chương trình nào mở đăng ký.</p>;
  }
  return (
    <div className="flex flex-col gap-10">
      {nhom.map((n) => (
        <section key={n.tieuDe} className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-bold text-ued-blue-dam">{n.tieuDe}</h2>
            <p className="text-sm text-muted-foreground">{n.moTa}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {n.ds.map((ct) => (
              <KhoiChuongTrinh key={ct.maCT} ct={ct} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

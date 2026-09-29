import Link from "next/link";
import { cn } from "@/lib/utils";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";

const NHAN_TRANG_THAI: Record<string, string> = {
  DU_THAO: "Dự thảo",
  CHO_THAM_DINH: "Chờ thẩm định",
  DA_BAN_HANH: "Đã ban hành",
  NGUNG_HIEU_LUC: "Ngừng hiệu lực",
};

const TAB = [
  { ma: "thong-tin", nhan: "Khung chương trình", duoi: "" },
  { ma: "hoc-lieu", nhan: "Học liệu & đánh giá", duoi: "/hoc-lieu" },
] as const;

/** Đầu trang chương trình: đường dẫn, tiêu đề + trạng thái, tab khung chương trình / học liệu. */
export function DauTrangChuongTrinh({
  chuongTrinh,
  dangChon,
}: {
  chuongTrinh: { id: string; maCT: string; ten: string; trangThai: string };
  dangChon: (typeof TAB)[number]["ma"];
}) {
  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Đường dẫn" className="text-sm text-muted-foreground">
        <Link href="/chuong-trinh">Chương trình bồi dưỡng</Link>
        <span className="mx-1.5">/</span>
        <span>{chuongTrinh.maCT}</span>
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-ued-blue-dam">
          {chuongTrinh.maCT} · {chuongTrinh.ten}
        </h1>
        <NhanTrangThai ma={chuongTrinh.trangThai}>{NHAN_TRANG_THAI[chuongTrinh.trangThai] ?? chuongTrinh.trangThai}</NhanTrangThai>
      </div>
      <nav aria-label="Phân hệ của chương trình" className="border-b">
        <ul className="-mb-px flex overflow-x-auto">
          {TAB.map((tab) => (
            <li key={tab.ma}>
              <Link
                href={`/chuong-trinh/${chuongTrinh.id}${tab.duoi}`}
                aria-current={tab.ma === dangChon ? "page" : undefined}
                className={cn(
                  "block border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap",
                  tab.ma === dangChon
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {tab.nhan}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

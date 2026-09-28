import Link from "next/link";
import { coQuyen } from "@/lib/auth/guard";
import { cn } from "@/lib/utils";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";

const NHAN_TRANG_THAI_KHOA: Record<string, string> = {
  CHUAN_BI: "Chuẩn bị",
  DANG_TUYEN_SINH: "Đang tuyển sinh",
  DANG_DIEN_RA: "Đang diễn ra",
  DA_KET_THUC: "Đã kết thúc",
  HUY: "Hủy",
};

// Các phân hệ của 1 khóa; tab chỉ hiện khi có quyền mở trang tương ứng
const TAB = [
  { ma: "tong-quan", nhan: "Tổng quan", duoi: "", quyen: ["KH-01"] },
  { ma: "lop-hoc", nhan: "Lớp học", duoi: "/lop-hoc", quyen: ["KH-07"] },
  { ma: "ket-qua", nhan: "Kết quả học tập", duoi: "/ket-qua", quyen: ["KQ-02", "KQ-03"] },
  { ma: "chung-chi", nhan: "Văn bằng", duoi: "/chung-chi", quyen: ["CC-01"] },
  { ma: "hoc-phi", nhan: "Học phí", duoi: "/hoc-phi", quyen: ["HP-01"] },
] as const;

type Props = {
  khoa: { id: string; maKhoa: string; trangThai: string; chuongTrinh: { ten: string } };
  dangChon: (typeof TAB)[number]["ma"];
  phu?: React.ReactNode;
};

/** Đầu trang dùng chung cho trang khóa và các trang con (lớp, kết quả, văn bằng, học phí). */
export async function DauTrangKhoa({ khoa, dangChon, phu }: Props) {
  const hienTab = [];
  for (const tab of TAB) {
    if ((await Promise.all(tab.quyen.map(coQuyen))).some(Boolean)) hienTab.push(tab);
  }
  const coDanhSach = await coQuyen("KH-01");

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Đường dẫn" className="text-sm text-muted-foreground">
        {coDanhSach ? <Link href="/khoa-hoc">Khóa bồi dưỡng</Link> : "Khóa bồi dưỡng"}
        <span className="mx-1.5">/</span>
        <span>{khoa.maKhoa}</span>
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-ued-blue-dam">
          {khoa.maKhoa} · {khoa.chuongTrinh.ten}
        </h1>
        <NhanTrangThai ma={khoa.trangThai}>{NHAN_TRANG_THAI_KHOA[khoa.trangThai] ?? khoa.trangThai}</NhanTrangThai>
        {phu}
      </div>
      {hienTab.length > 1 && (
        <nav aria-label="Phân hệ của khóa" className="border-b print:hidden">
          <ul className="-mb-px flex overflow-x-auto">
            {hienTab.map((tab) => (
              <li key={tab.ma}>
                <Link
                  href={`/khoa-hoc/${khoa.id}${tab.duoi}`}
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
      )}
    </div>
  );
}

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
  { ma: "tuyen-sinh", nhan: "Tuyển sinh", duoi: "/tuyen-sinh", quyen: ["KH-01"] },
  { ma: "giang-day", nhan: "Giảng dạy", duoi: "/giang-day", quyen: ["KH-01"] },
  { ma: "lop-hoc", nhan: "Lớp học", duoi: "/lop-hoc", quyen: ["KH-07"] },
  // (sửa 06/10/2026) chỉ theo KQ-02 (cán bộ đào tạo): cán bộ tài chính có KQ-03 nhưng tab kết quả
  // học tập không liên quan công việc của họ
  { ma: "ket-qua", nhan: "Kết quả học tập", duoi: "/ket-qua", quyen: ["KQ-02"] },
  { ma: "chung-chi", nhan: "Văn bằng", duoi: "/chung-chi", quyen: ["CC-01"] },
  { ma: "hoc-phi", nhan: "Học phí", duoi: "/hoc-phi", quyen: ["HP-01"] },
] as const;

type Props = {
  khoa: { id: string; maKhoa: string; tenKhoa?: string | null; trangThai: string; chuongTrinh: { ten: string } };
  dangChon: (typeof TAB)[number]["ma"];
  phu?: React.ReactNode;
};

/** Đầu trang dùng chung cho trang khóa và các trang con (tuyển sinh, giảng dạy, lớp, kết quả, văn bằng, học phí). */
export async function DauTrangKhoa({ khoa, dangChon, phu }: Props) {
  const hienTab = [];
  for (const tab of TAB) {
    if ((await Promise.all(tab.quyen.map(coQuyen))).some(Boolean)) hienTab.push(tab);
  }
  // đường dẫn cha: danh sách khóa (KH-01), cán bộ tài chính không có KH-01 thì về danh sách học phí theo khóa
  const cha = (await coQuyen("KH-01"))
    ? { href: "/khoa-hoc", nhan: "Khóa bồi dưỡng" }
    : (await coQuyen("HP-01"))
      ? { href: "/hoc-phi", nhan: "Học phí theo khóa" }
      : null;

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Đường dẫn" className="text-sm text-muted-foreground">
        {cha ? <Link href={cha.href}>{cha.nhan}</Link> : "Khóa bồi dưỡng"}
        <span className="mx-1.5">/</span>
        <span>{khoa.maKhoa}</span>
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-ued-blue-dam">
          {khoa.maKhoa} · {khoa.tenKhoa ?? khoa.chuongTrinh.ten}
          {/* (bổ sung 06/10/2026) khóa có tên riêng: hiện thêm tên chương trình */}
          {khoa.tenKhoa && <span className="block text-sm font-normal text-muted-foreground">Chương trình: {khoa.chuongTrinh.ten}</span>}
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

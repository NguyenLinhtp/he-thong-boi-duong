import Link from "next/link";
import { Building2, FileSpreadsheet, FolderSearch, GraduationCap, Landmark, Wallet } from "lucide-react";
import { coQuyen } from "@/lib/auth/guard";

// Danh mục báo cáo dạng thẻ (icon + tiêu đề + mô tả), chỉ hiện báo cáo có quyền
const BAO_CAO = [
  { maCN: "BC-02", href: "/bao-cao/dao-tao", icon: GraduationCap, ten: "Hoạt động đào tạo", moTa: "Số khóa, học viên, tỷ lệ hoàn thành theo kỳ; xuất Excel/PDF." },
  { maCN: "BC-03", href: "/bao-cao/tai-chinh", icon: Wallet, ten: "Tài chính học phí", moTa: "Doanh thu, công nợ học phí theo khóa/đợt phục vụ đối soát." },
  { maCN: "HP-05", href: "/hoc-phi/bao-cao", icon: Landmark, ten: "Doanh thu & công nợ học phí", moTa: "Tổng hợp thu theo khóa/đợt/thời gian, khớp phiếu thu đã lập." },
  { maCN: "BC-04", href: "/bao-cao/mau-bieu", icon: FileSpreadsheet, ten: "Mẫu gửi cấp trên", moTa: "Kết xuất báo cáo đúng biểu mẫu của Bộ/Sở GDĐT." },
  { maCN: "BC-05", href: "/bao-cao/ho-so-luu-tru", icon: FolderSearch, ten: "Hồ sơ lưu trữ", moTa: "Tra cứu hồ sơ chương trình, khóa, học viên, văn bằng đã lưu trữ." },
  { maCN: "DVLK-07", href: "/don-vi-lien-ket/bao-cao", icon: Building2, ten: "Theo đơn vị liên kết", moTa: "Số học viên, doanh thu, công nợ chưa thanh lý theo đơn vị." },
];

export async function DanhMucBaoCao() {
  const ds = [];
  for (const bc of BAO_CAO) if (await coQuyen(bc.maCN)) ds.push(bc);
  if (ds.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold text-ued-blue-dam">Báo cáo</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ds.map(({ href, icon: Icon, ten, moTa }) => (
          <Link
            key={href}
            href={href}
            className="group flex gap-3 rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-bold text-ued-blue-dam group-hover:underline">{ten}</span>
              <span className="text-sm text-muted-foreground">{moTa}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

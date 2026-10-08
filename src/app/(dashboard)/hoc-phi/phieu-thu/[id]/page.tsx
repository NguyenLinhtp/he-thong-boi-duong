import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { chiTietPhieuThu } from "@/server/services/hp/hp-04-phieu-thu";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { NutIn } from "./nut-in";
import { noiDungInPhieuThu } from "@/server/services/chung/mau-in";
import { BanInBienLai } from "@/components/mau-in/ban-in-bien-lai";

// HP-04: "in/xuất được PDF" - chưa có thư viện tạo PDF trong dự án, dùng
// trang HTML in được (Ctrl+P / Lưu thành PDF của trình duyệt) thay vì tự
// dựng bộ sinh PDF riêng - đủ đáp ứng "xuất chứng từ" ở quy mô nội bộ.
export default async function PhieuThuPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("HP-04");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const { id } = await params;
  const phieuThu = await chiTietPhieuThu(id);
  if (!phieuThu) notFound();

  const nd = await noiDungInPhieuThu(phieuThu);

  // (bổ sung 07/10/2026) biên lai thu tiền mẫu C45-BB theo mẫu của chương trình (nội dung chốt khi lập)
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-8 print:max-w-none print:p-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-muted-foreground">
          Hình thức nộp: {phieuThu.hinhThucNop ?? "—"} · Khóa {phieuThu.hocPhi.khoa.maKhoa}
        </p>
        <NutIn />
      </div>
      <div className="rounded-lg border print:border-0">
        <BanInBienLai
          nd={nd}
          soPhieu={phieuThu.soPhieu}
          ngayLap={phieuThu.ngayLap}
          soTien={Number(phieuThu.soTien)}
          nguoiThuTen={phieuThu.nguoiLapTen}
          thayChoSoPhieu={phieuThu.thayChoSoPhieu}
          daHuy={phieuThu.daHuy ? { luc: phieuThu.huyLuc, lyDo: phieuThu.lyDoHuy, nguoi: phieuThu.nguoiHuyTen } : null}
        />
      </div>
    </main>
  );
}

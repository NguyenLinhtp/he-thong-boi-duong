import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { chiTietPhieuThu } from "@/server/services/hp/hp-04-phieu-thu";
import { NutIn } from "./nut-in";

// HP-04: "in/xuất được PDF" - chưa có thư viện tạo PDF trong dự án, dùng
// trang HTML in được (Ctrl+P / Lưu thành PDF của trình duyệt) thay vì tự
// dựng bộ sinh PDF riêng - đủ đáp ứng "xuất chứng từ" ở quy mô nội bộ.
export default async function PhieuThuPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("HP-04");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { id } = await params;
  const phieuThu = await chiTietPhieuThu(id);
  if (!phieuThu) notFound();

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-8 print:p-0">
      <h1 className="text-center text-lg font-semibold">PHIẾU THU HỌC PHÍ</h1>
      <p className="text-center text-sm text-muted-foreground">Số phiếu: {phieuThu.soPhieu}</p>
      <div className="flex flex-col gap-2 rounded-lg border p-4 text-sm">
        <p>Học viên: {phieuThu.hocPhi.hocVien.hoTen}</p>
        <p>Khóa: {phieuThu.hocPhi.khoa.maKhoa}</p>
        <p>Số tiền: {Number(phieuThu.soTien).toLocaleString("vi-VN")}đ</p>
        <p>Hình thức nộp: {phieuThu.hinhThucNop ?? "—"}</p>
        <p>Ngày lập: {phieuThu.ngayLap.toLocaleString("vi-VN")}</p>
        <p>Người lập: {phieuThu.nguoiLapTen ?? "—"}</p>
      </div>
      <NutIn />
    </main>
  );
}

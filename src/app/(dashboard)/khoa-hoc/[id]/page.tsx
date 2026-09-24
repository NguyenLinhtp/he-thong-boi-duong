import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";

const NHAN_TRANG_THAI: Record<string, string> = {
  CHUAN_BI: "Chuẩn bị",
  DANG_TUYEN_SINH: "Đang tuyển sinh",
  DANG_DIEN_RA: "Đang diễn ra",
  DA_KET_THUC: "Đã kết thúc",
  HUY: "Hủy",
};

const NHAN_PHUONG_THUC: Record<string, string> = {
  TRUC_TUYEN_NOP_GIAY: "PT1 · Đăng ký trực tuyến, in đơn nộp bản giấy",
  IMPORT_TU_XAC_NHAN: "PT2 · Import danh sách sẵn, học viên tự xác nhận",
  CHI_DU_THI: "PT3 · Chỉ đăng ký dự thi, không qua học",
  QUA_DON_VI_LIEN_KET: "PT4 · Qua đơn vị liên kết",
};

export default async function ChiTietKhoaPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("KH-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { id } = await params;
  const khoa = await layKhoa(id);
  if (!khoa) notFound();

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">
        {khoa.maKhoa} · {khoa.chuongTrinh.ten}
      </h1>
      <div className="rounded-lg border p-4 text-sm">
        <p>Chương trình: {khoa.chuongTrinh.maCT} · {khoa.chuongTrinh.ten}</p>
        <p>Trạng thái: {NHAN_TRANG_THAI[khoa.trangThai] ?? khoa.trangThai}</p>
        <p>
          Phương thức đăng ký (kế thừa từ chương trình):{" "}
          {khoa.chuongTrinh.phuongThucDangKy
            ? (NHAN_PHUONG_THUC[khoa.chuongTrinh.phuongThucDangKy] ??
              khoa.chuongTrinh.phuongThucDangKy)
            : "Chưa thiết lập ở chương trình"}
        </p>
        <p>
          Khai giảng:{" "}
          {khoa.thoiGianKhaiGiang
            ? new Date(khoa.thoiGianKhaiGiang).toLocaleDateString("vi-VN")
            : "—"}
        </p>
        <p>
          Bế giảng:{" "}
          {khoa.thoiGianBeGiang ? new Date(khoa.thoiGianBeGiang).toLocaleDateString("vi-VN") : "—"}
        </p>
        <p>Sĩ số tối đa: {khoa.siSoToiDa}</p>
        <p>Mức học phí: {khoa.mucHocPhi ? khoa.mucHocPhi.toString() : "—"}</p>
        <p>Đợt tuyển sinh: {khoa.dotTuyenSinh?.ten ?? "—"}</p>
      </div>
    </main>
  );
}

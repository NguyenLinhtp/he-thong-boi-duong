import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { khoaHocCuaToi } from "@/server/services/gd/gd-04-hoc-tap";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { TrangThaiRong } from "@/components/chung/trang-thai-rong";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";
import { dinhDangNgay } from "@/lib/dinh-dang";
import { VongTienDo } from "./vong-tien-do";

const NHAN_TRANG_THAI_KHOA: Record<string, string> = {
  CHUAN_BI: "Chuẩn bị",
  DANG_TUYEN_SINH: "Sắp khai giảng",
  DANG_DIEN_RA: "Đang học",
  DA_KET_THUC: "Đã kết thúc",
  HUY: "Hủy",
};

// GD-04 (bổ sung 29/09/2026): các khóa học của học viên kèm tiến độ
export default async function KhoaHocCuaToiPage() {
  let phien;
  try {
    phien = await requirePermission("GD-04");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }
  const { hocVien, dsKhoa } = await khoaHocCuaToi(phien.userId);

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <h1 className="text-xl font-bold text-ued-blue-dam">Khóa học của tôi</h1>
      {!hocVien ? (
        <TrangThaiRong>Tài khoản chưa gắn với hồ sơ học viên.</TrangThaiRong>
      ) : dsKhoa.length === 0 ? (
        <TrangThaiRong>Bạn chưa là học viên chính thức của khóa học nào.</TrangThaiRong>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {dsKhoa.map(({ khoa, phanTram, tongMuc, soMucXong }) => (
            <li key={khoa.id}>
              <Link
                href={`/hoc-tap/${khoa.id}`}
                className="group flex h-full items-center gap-4 rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <VongTienDo phanTram={phanTram} />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{khoa.maKhoa}</span>
                    <NhanTrangThai ma={khoa.trangThai}>{NHAN_TRANG_THAI_KHOA[khoa.trangThai] ?? khoa.trangThai}</NhanTrangThai>
                  </span>
                  <span className="font-bold text-ued-blue-dam group-hover:underline">{khoa.chuongTrinh.ten}</span>
                  <span className="text-sm text-muted-foreground">
                    {dinhDangNgay(khoa.thoiGianKhaiGiang)} – {dinhDangNgay(khoa.thoiGianBeGiang)} · {soMucXong}/{tongMuc} mục
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

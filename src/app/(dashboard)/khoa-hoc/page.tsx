import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { timKiemChuongTrinh } from "@/server/services/ct/ct-05-tra-cuu";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { FormTaoKhoa } from "./form-tao-khoa";

const NHAN_TRANG_THAI: Record<string, string> = {
  CHUAN_BI: "Chuẩn bị",
  DANG_TUYEN_SINH: "Đang tuyển sinh",
  DANG_DIEN_RA: "Đang diễn ra",
  DA_KET_THUC: "Đã kết thúc",
  HUY: "Hủy",
};

export default async function KhoaHocPage() {
  try {
    await requirePermission("KH-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const [dsKhoa, dsChuongTrinhDaBanHanh] = await Promise.all([
    danhSachKhoa(),
    timKiemChuongTrinh({ trangThai: "DA_BAN_HANH" }),
  ]);

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <h1 className="text-xl font-bold text-ued-blue-dam">KH-01 · Khóa bồi dưỡng</h1>

      {dsChuongTrinhDaBanHanh.length > 0 ? (
        <FormTaoKhoa
          dsChuongTrinh={dsChuongTrinhDaBanHanh.map((ct) => ({
            id: ct.id,
            maCT: ct.maCT,
            ten: ct.ten,
          }))}
        />
      ) : (
        <p className="rounded-lg border bg-card p-4 shadow-sm text-sm text-muted-foreground">
          Chưa có chương trình nào ở trạng thái Đã ban hành để khởi tạo khóa.
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã khóa</TableHead>
            <TableHead>Chương trình</TableHead>
            <TableHead>Khai giảng</TableHead>
            <TableHead>Bế giảng</TableHead>
            <TableHead>Sĩ số tối đa</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsKhoa.map((khoa) => (
            <TableRow key={khoa.id}>
              <TableCell>{khoa.maKhoa}</TableCell>
              <TableCell>
                {khoa.chuongTrinh.maCT} · {khoa.chuongTrinh.ten}
              </TableCell>
              <TableCell>
                {khoa.thoiGianKhaiGiang
                  ? new Date(khoa.thoiGianKhaiGiang).toLocaleDateString("vi-VN")
                  : "—"}
              </TableCell>
              <TableCell>
                {khoa.thoiGianBeGiang
                  ? new Date(khoa.thoiGianBeGiang).toLocaleDateString("vi-VN")
                  : "—"}
              </TableCell>
              <TableCell>{khoa.siSoToiDa}</TableCell>
              <TableCell>{NHAN_TRANG_THAI[khoa.trangThai] ?? khoa.trangThai}</TableCell>
              <TableCell>
                <Link href={`/khoa-hoc/${khoa.id}`} className="text-sm text-primary underline">
                  Xem
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {dsKhoa.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                Chưa có khóa bồi dưỡng nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </main>
  );
}

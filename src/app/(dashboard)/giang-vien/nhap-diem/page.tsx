import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { giangVienCuaTaiKhoan } from "@/server/services/gd/dung-chung";
import { hocPhanPhuTrach } from "@/server/services/kq/kq-01-nhap-diem";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

export default async function HocPhanNhapDiemPage() {
  let phien;
  try {
    phien = await requirePermission("KQ-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const giangVien = await giangVienCuaTaiKhoan(phien.userId);
  if (!giangVien) {
    return (
      <p className="p-6 text-destructive">Tài khoản đăng nhập chưa gắn với hồ sơ giảng viên nào.</p>
    );
  }

  const dsPhanCong = await hocPhanPhuTrach(giangVien.id);

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">KQ-01 · Nhập điểm học phần phụ trách</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Khóa</TableHead>
            <TableHead>Chương trình</TableHead>
            <TableHead>Học phần</TableHead>
            <TableHead>Số tiết</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsPhanCong.map((pc) => (
            <TableRow key={pc.id}>
              <TableCell>{pc.khoa.maKhoa}</TableCell>
              <TableCell>{pc.khoa.chuongTrinh.ten}</TableCell>
              <TableCell>{pc.hocPhan.ten}</TableCell>
              <TableCell>{pc.hocPhan.soTiet}</TableCell>
              <TableCell>
                <Link href={`/giang-vien/nhap-diem/${pc.khoaId}/${pc.hocPhanId}`} className="text-sm underline">
                  Nhập điểm
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {dsPhanCong.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Chưa được phân công học phần nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </main>
  );
}

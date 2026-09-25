import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { giangVienCuaTaiKhoan } from "@/server/services/gd/dung-chung";
import { lichDayGiangVien } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

export default async function DanhSachBuoiHocGiangVienPage() {
  let phien;
  try {
    phien = await requirePermission("GD-01");
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
      <p className="p-6 text-destructive">
        Tài khoản đăng nhập chưa gắn với hồ sơ giảng viên nào.
      </p>
    );
  }

  const dsBuoiHoc = await lichDayGiangVien(giangVien.id);

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">Buổi học được phân công</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ngày</TableHead>
            <TableHead>Giờ</TableHead>
            <TableHead>Khóa</TableHead>
            <TableHead>Học phần</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsBuoiHoc.map((bh) => (
            <TableRow key={bh.id}>
              <TableCell>{new Date(bh.ngayHoc).toLocaleDateString("vi-VN")}</TableCell>
              <TableCell>
                {bh.gioBatDau && bh.gioKetThuc ? `${bh.gioBatDau} – ${bh.gioKetThuc}` : "—"}
              </TableCell>
              <TableCell>{bh.khoa.maKhoa}</TableCell>
              <TableCell>{bh.hocPhan?.ten ?? "—"}</TableCell>
              <TableCell>{bh.daHuy ? "Đã hủy" : "Bình thường"}</TableCell>
              <TableCell>
                <Link href={`/giang-vien/buoi-hoc/${bh.id}`} className="text-sm underline">
                  Điểm danh / nhật ký
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {dsBuoiHoc.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                Chưa được phân công buổi học nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </main>
  );
}

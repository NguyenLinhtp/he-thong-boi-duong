import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachChuongTrinh } from "@/server/services/ct/ct-01-tao-chuong-trinh";
import { danhSachLoaiHinhBoiDuong } from "@/server/services/dm/dm-03-loai-hinh-boi-duong";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { FormTaoChuongTrinh } from "./form-tao-chuong-trinh";

const NHAN_TRANG_THAI: Record<string, string> = {
  DU_THAO: "Dự thảo",
  CHO_THAM_DINH: "Chờ thẩm định",
  DA_BAN_HANH: "Đã ban hành",
  NGUNG_HIEU_LUC: "Ngừng hiệu lực",
};

export default async function ChuongTrinhPage() {
  try {
    await requirePermission("CT-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const [dsChuongTrinh, dsLoaiHinh] = await Promise.all([
    danhSachChuongTrinh(),
    danhSachLoaiHinhBoiDuong(),
  ]);

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">CT-01 · Chương trình bồi dưỡng</h1>
      <FormTaoChuongTrinh dsLoaiHinh={dsLoaiHinh.map((lh) => ({ id: lh.id, ten: lh.ten }))} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã CT</TableHead>
            <TableHead>Tên chương trình</TableHead>
            <TableHead>Loại hình</TableHead>
            <TableHead>Tổng thời lượng</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsChuongTrinh.map((ct) => (
            <TableRow key={ct.id}>
              <TableCell>{ct.maCT}</TableCell>
              <TableCell>{ct.ten}</TableCell>
              <TableCell>{ct.loaiHinhBoiDuong.ten}</TableCell>
              <TableCell>{ct.tongThoiLuong ?? "—"}</TableCell>
              <TableCell>{NHAN_TRANG_THAI[ct.trangThai] ?? ct.trangThai}</TableCell>
              <TableCell>
                <Link href={`/chuong-trinh/${ct.id}`} className="text-sm text-primary underline">
                  Xem/sửa
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SearchParams = Promise<{ doiTuong?: string; doiTuongId?: string }>;

export default async function NhatKyPage({ searchParams }: { searchParams: SearchParams }) {
  try {
    await requirePermission("QT-03");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { doiTuong, doiTuongId } = await searchParams;
  const dsNhatKy = await danhSachNhatKy({ doiTuong, doiTuongId });

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">QT-03 · Nhật ký thao tác</h1>
      <p className="text-sm text-muted-foreground">
        Ghi lại các thao tác quan trọng (xác nhận thanh toán, ký duyệt, cấu hình hệ thống...).
        Không thể sửa/xóa nhật ký đã ghi. Hiển thị tối đa 500 dòng gần nhất theo bộ lọc.
      </p>

      <form className="flex items-end gap-3 rounded-lg border p-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm" htmlFor="doiTuong">
            Đối tượng
          </label>
          <Input id="doiTuong" name="doiTuong" defaultValue={doiTuong} placeholder="vd HocPhi" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm" htmlFor="doiTuongId">
            Mã đối tượng
          </label>
          <Input id="doiTuongId" name="doiTuongId" defaultValue={doiTuongId} />
        </div>
        <Button type="submit" size="sm">
          Lọc
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thời gian</TableHead>
            <TableHead>Người thực hiện</TableHead>
            <TableHead>Hành động</TableHead>
            <TableHead>Đối tượng</TableHead>
            <TableHead>Chi tiết</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsNhatKy.map((n) => (
            <TableRow key={n.id}>
              <TableCell>{n.thoiGian.toLocaleString("vi-VN")}</TableCell>
              <TableCell>{n.nguoiThucHienTen}</TableCell>
              <TableCell>{n.hanhDong}</TableCell>
              <TableCell className="font-mono text-xs">
                {n.doiTuong}#{n.doiTuongId}
              </TableCell>
              <TableCell className="text-muted-foreground">{n.chiTiet}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

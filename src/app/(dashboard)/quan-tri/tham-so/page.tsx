import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachThamSo } from "@/server/services/qt/qt-05-tham-so";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { FormThamSo } from "./form-tham-so";
import { NutXoaThamSo } from "./nut-xoa-tham-so";

export default async function ThamSoPage() {
  try {
    await requirePermission("QT-05");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const dsThamSo = await danhSachThamSo();

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">QT-05 · Cấu hình tham số hệ thống</h1>
      <p className="text-sm text-muted-foreground">
        Tham số dùng chung toàn hệ thống (vd số ngày hạn nộp bản giấy, chính sách mật khẩu...).
        Mỗi lần thêm/sửa/xóa được ghi vào{" "}
        <a href="/quan-tri/nhat-ky" className="underline">
          nhật ký thao tác (QT-03)
        </a>
        .
      </p>

      <FormThamSo />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã</TableHead>
            <TableHead>Giá trị</TableHead>
            <TableHead>Mô tả</TableHead>
            <TableHead>Cập nhật lúc</TableHead>
            <TableHead>Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsThamSo.map((ts) => (
            <TableRow key={ts.id}>
              <TableCell className="font-mono">{ts.ma}</TableCell>
              <TableCell>{ts.giaTri}</TableCell>
              <TableCell className="text-muted-foreground">{ts.moTa}</TableCell>
              <TableCell>{ts.capNhatLuc.toLocaleString("vi-VN")}</TableCell>
              <TableCell>
                <NutXoaThamSo ma={ts.ma} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

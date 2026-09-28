import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachTaiKhoan } from "@/server/services/qt/qt-01-quan-ly-tai-khoan";
import { Table, TableHeader, TableBody, TableHead, TableRow } from "@/components/ui/table";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { FormTaoTaiKhoan } from "./form-tao-tai-khoan";
import { HangTaiKhoan } from "./hang-tai-khoan";

export default async function TaiKhoanPage() {
  try {
    await requirePermission("QT-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const taiKhoans = await danhSachTaiKhoan();

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <h1 className="text-xl font-bold text-ued-blue-dam">QT-01 · Quản lý tài khoản người dùng</h1>
      <FormTaoTaiKhoan />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên đăng nhập</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead>Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {taiKhoans.map((tk) => (
            <HangTaiKhoan
              key={tk.id}
              taiKhoan={{
                id: tk.id,
                tenDangNhap: tk.tenDangNhap,
                hoTen: tk.hoTen,
                trangThai: tk.trangThai,
                vaiTros: tk.vaiTros.map((v) => v.vaiTro.ma),
              }}
            />
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachSinhVien } from "@/server/services/hv/hv-03-danh-sach-sinh-vien";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { TrangThaiRong } from "@/components/chung/trang-thai-rong";
import { FormImportSinhVien } from "./form-import";

// (bổ sung 01/10/2026 - HV-03) danh sách sinh viên của trường - nguồn tra cứu khi đăng ký dự thi bằng mã sinh viên
export default async function DanhSachSinhVienPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  try {
    await requirePermission("HV-03");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }
  const { q } = await searchParams;
  const { ds, tong } = await danhSachSinhVien(q);

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <div>
        <h1 className="text-xl font-bold text-ued-blue-dam">Danh sách sinh viên</h1>
        <p className="text-sm text-muted-foreground">
          Dữ liệu thí sinh có sẵn của trường. Khi đăng ký dự thi (chương trình định danh bằng mã sinh viên), thí sinh
          nhập mã sinh viên để hệ thống tự điền họ tên, lớp. Nạp lại tệp sẽ cập nhật theo mã sinh viên.
        </p>
      </div>

      <FormImportSinhVien />

      <form method="get" className="flex items-end gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Tìm theo mã sinh viên, họ tên, lớp, CCCD..." className="max-w-md" />
        <Button type="submit" variant="secondary">
          Tìm kiếm
        </Button>
      </form>

      {ds.length === 0 ? (
        <TrangThaiRong>{q ? "Không có sinh viên phù hợp" : "Chưa nạp danh sách sinh viên nào"}</TrangThaiRong>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {tong.toLocaleString("vi-VN")} sinh viên{ds.length < tong && ` - hiển thị ${ds.length} dòng đầu, hãy tìm kiếm để thu hẹp`}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã sinh viên</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Số CCCD</TableHead>
                <TableHead>Lớp sinh hoạt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ds.map((sv) => (
                <TableRow key={sv.id}>
                  <TableCell className="font-mono">{sv.maSinhVien}</TableCell>
                  <TableCell>{sv.hoTen}</TableCell>
                  <TableCell className="font-mono">{sv.soCCCD}</TableCell>
                  <TableCell>{sv.lopSinhHoat ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </main>
  );
}

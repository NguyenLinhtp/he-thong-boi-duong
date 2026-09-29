import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachDotTuyenSinh } from "@/server/services/dm/dm-05-dot-tuyen-sinh";
import { xoaDotTuyenSinhAction } from "./actions";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { NutXoa } from "@/components/danh-muc/nut-xoa";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { FormDotTuyenSinh } from "./form-dot-tuyen-sinh";

function dinhDangNgay(ngay: Date) {
  return ngay.toLocaleDateString("vi-VN");
}

export default async function DotTuyenSinhPage() {
  try {
    await requirePermission("DM-05");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const dsDot = await danhSachDotTuyenSinh();

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <h1 className="text-xl font-bold text-ued-blue-dam">DM-05 · Danh mục đợt/kỳ tuyển sinh</h1>
      <FormDotTuyenSinh />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã</TableHead>
            <TableHead>Tên đợt</TableHead>
            <TableHead>Bắt đầu</TableHead>
            <TableHead>Kết thúc</TableHead>
            <TableHead>Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsDot.map((dot) => (
            <TableRow key={dot.id}>
              <TableCell>{dot.ma}</TableCell>
              <TableCell>{dot.ten}</TableCell>
              <TableCell>{dinhDangNgay(dot.ngayBatDau)}</TableCell>
              <TableCell>{dinhDangNgay(dot.ngayKetThuc)}</TableCell>
              <TableCell>
                <NutXoa ten={dot.ten} onXoa={xoaDotTuyenSinhAction.bind(null, dot.id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { baoCaoDoanhThu, baoCaoCongNo } from "@/server/services/hp/hp-05-bao-cao";
import { khoangNgay } from "@/server/services/bc/khoang-ngay";
import { LoiBaoCao } from "@/server/services/bc/loi-bao-cao";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SearchParams = Promise<{ tuNgay?: string; denNgay?: string }>;

export default async function BaoCaoHocPhiPage({ searchParams }: { searchParams: SearchParams }) {
  try {
    await requirePermission("HP-05");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { tuNgay, denNgay } = await searchParams;
  // "đến ngày" tính hết ngày đó (trước đây so với 00:00 nên bỏ sót phiếu thu lập trong ngày cuối)
  let ky;
  try {
    ky = khoangNgay(tuNgay, denNgay);
  } catch (error) {
    if (error instanceof LoiBaoCao) return <p className="p-6 text-destructive">{error.message}</p>;
    throw error;
  }
  const [doanhThu, congNo] = await Promise.all([
    baoCaoDoanhThu({ tuNgay: ky.tu, denNgay: ky.den }),
    baoCaoCongNo(),
  ]);

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">HP-05 · Báo cáo doanh thu và công nợ học phí</h1>

      <form className="flex items-end gap-3 rounded-lg border p-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm" htmlFor="tuNgay">
            Từ ngày
          </label>
          <Input id="tuNgay" name="tuNgay" type="date" defaultValue={tuNgay} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm" htmlFor="denNgay">
            Đến ngày
          </label>
          <Input id="denNgay" name="denNgay" type="date" defaultValue={denNgay} />
        </div>
        <Button type="submit" size="sm">
          Lọc
        </Button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">
          Doanh thu: {doanhThu.tongDoanhThu.toLocaleString("vi-VN")}đ ({doanhThu.soPhieuThu} phiếu thu)
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khóa</TableHead>
              <TableHead>Số phiếu thu</TableHead>
              <TableHead>Doanh thu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doanhThu.theoKhoa.map((k) => (
              <TableRow key={k.maKhoa}>
                <TableCell>{k.maKhoa}</TableCell>
                <TableCell>{k.soPhieu}</TableCell>
                <TableCell>{k.soTien.toLocaleString("vi-VN")}đ</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">
          Công nợ hiện tại: {congNo.tongConNo.toLocaleString("vi-VN")}đ ({congNo.soHocVienConNo} học viên)
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khóa</TableHead>
              <TableHead>Số học viên còn nợ</TableHead>
              <TableHead>Tổng còn nợ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {congNo.theoKhoa.map((k) => (
              <TableRow key={k.maKhoa}>
                <TableCell>{k.maKhoa}</TableCell>
                <TableCell>{k.soHocVien}</TableCell>
                <TableCell>{k.soConNo.toLocaleString("vi-VN")}đ</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachHocVien, phamViHoSoHocVien } from "@/server/services/hv/hv-08-ho-so-hoc-vien";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function HocVienPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  let phien;
  try {
    phien = await requirePermission("HV-08");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { q } = await searchParams;
  const phamVi = await phamViHoSoHocVien(phien.userId);
  // học viên: chỉ có hồ sơ của chính mình -> vào thẳng
  if (!phamVi.toanBo) {
    if (phamVi.hocVienId) redirect(`/hoc-vien/${phamVi.hocVienId}`);
    return <p className="p-6 text-muted-foreground">Tài khoản chưa được liên kết với hồ sơ học viên nào.</p>;
  }
  const dsHocVien = await danhSachHocVien(q || undefined, phamVi);

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">HV-08 · Hồ sơ học viên</h1>

      <form method="get" className="flex items-end gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Tìm theo tên, mã học viên, CCCD..." />
        <Button type="submit">Tìm kiếm</Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã học viên</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>CCCD</TableHead>
            <TableHead>Đơn vị công tác</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsHocVien.map((hv) => (
            <TableRow key={hv.id}>
              <TableCell>{hv.maHocVien}</TableCell>
              <TableCell>{hv.hoTen}</TableCell>
              <TableCell>{hv.soCCCD ?? "—"}</TableCell>
              <TableCell>{hv.donViCongTac ?? "—"}</TableCell>
              <TableCell>
                <Link href={`/hoc-vien/${hv.id}`} className="text-sm text-primary underline">
                  Xem hồ sơ
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {dsHocVien.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Không tìm thấy học viên phù hợp
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </main>
  );
}

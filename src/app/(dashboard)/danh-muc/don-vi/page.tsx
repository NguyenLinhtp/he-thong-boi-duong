import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachDonVi } from "@/server/services/dm/dm-01-don-vi";
import { xoaDonViAction } from "./actions";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { NutXoa } from "@/components/danh-muc/nut-xoa";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { FormDonVi } from "./form-don-vi";

export default async function DonViPage() {
  try {
    await requirePermission("DM-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const dsDonVi = await danhSachDonVi();

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <h1 className="text-xl font-bold text-ued-blue-dam">DM-01 · Danh mục đơn vị/phòng ban</h1>
      <FormDonVi dsDonVi={dsDonVi.map((dv) => ({ id: dv.id, ten: dv.ten }))} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã</TableHead>
            <TableHead>Tên đơn vị</TableHead>
            <TableHead>Đơn vị cấp trên</TableHead>
            <TableHead>Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsDonVi.map((dv) => (
            <TableRow key={dv.id}>
              <TableCell>{dv.ma}</TableCell>
              <TableCell>{dv.ten}</TableCell>
              <TableCell>{dv.donViCha?.ten ?? "—"}</TableCell>
              <TableCell>
                <NutXoa ten={dv.ten} onXoa={xoaDonViAction.bind(null, dv.id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

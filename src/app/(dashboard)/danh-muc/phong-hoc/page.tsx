import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachPhongHoc } from "@/server/services/dm/dm-04-phong-hoc";
import { xoaPhongHocAction } from "./actions";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { NutXoa } from "@/components/danh-muc/nut-xoa";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { FormPhongHoc } from "./form-phong-hoc";

export default async function PhongHocPage() {
  try {
    await requirePermission("DM-04");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const dsPhongHoc = await danhSachPhongHoc();

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <h1 className="text-xl font-bold text-ued-blue-dam">DM-04 · Danh mục phòng học/địa điểm</h1>
      <FormPhongHoc />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã</TableHead>
            <TableHead>Tên phòng</TableHead>
            <TableHead>Cơ sở</TableHead>
            <TableHead>Sức chứa</TableHead>
            <TableHead>Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsPhongHoc.map((ph) => (
            <TableRow key={ph.id}>
              <TableCell>{ph.ma}</TableCell>
              <TableCell>{ph.ten}</TableCell>
              <TableCell>{ph.coSo ?? "—"}</TableCell>
              <TableCell>{ph.sucChua ?? "—"}</TableCell>
              <TableCell>
                <NutXoa ten={ph.ten} onXoa={xoaPhongHocAction.bind(null, ph.id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

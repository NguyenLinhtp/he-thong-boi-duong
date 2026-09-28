import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachLoaiHinhBoiDuong } from "@/server/services/dm/dm-03-loai-hinh-boi-duong";
import { xoaLoaiHinhAction } from "./actions";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { NutXoa } from "@/components/danh-muc/nut-xoa";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { FormLoaiHinh } from "./form-loai-hinh";

export default async function LoaiHinhPage() {
  try {
    await requirePermission("DM-03");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const dsLoaiHinh = await danhSachLoaiHinhBoiDuong();

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <h1 className="text-xl font-bold text-ued-blue-dam">DM-03 · Danh mục loại hình bồi dưỡng</h1>
      <FormLoaiHinh />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã</TableHead>
            <TableHead>Tên loại hình</TableHead>
            <TableHead>Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsLoaiHinh.map((lh) => (
            <TableRow key={lh.id}>
              <TableCell>{lh.ma}</TableCell>
              <TableCell>{lh.ten}</TableCell>
              <TableCell>
                <NutXoa ten={lh.ten} onXoa={() => xoaLoaiHinhAction(lh.id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachChucDanhHocVi } from "@/server/services/dm/dm-02-chuc-danh-hoc-vi";
import { xoaChucDanhAction } from "./actions";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { NutXoa } from "@/components/danh-muc/nut-xoa";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { FormChucDanh } from "./form-chuc-danh";

const NHAN_LOAI: Record<string, string> = {
  chuc_danh: "Chức danh nghề nghiệp",
  hoc_ham: "Học hàm",
  hoc_vi: "Học vị",
};

export default async function ChucDanhPage() {
  try {
    await requirePermission("DM-02");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const dsChucDanh = await danhSachChucDanhHocVi();

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <h1 className="text-xl font-bold text-ued-blue-dam">DM-02 · Danh mục chức danh, học hàm/học vị</h1>
      <FormChucDanh />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã</TableHead>
            <TableHead>Tên</TableHead>
            <TableHead>Phân loại</TableHead>
            <TableHead>Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsChucDanh.map((cd) => (
            <TableRow key={cd.id}>
              <TableCell>{cd.ma}</TableCell>
              <TableCell>{cd.ten}</TableCell>
              <TableCell>{NHAN_LOAI[cd.loai] ?? cd.loai}</TableCell>
              <TableCell>
                <NutXoa ten={cd.ten} onXoa={() => xoaChucDanhAction(cd.id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

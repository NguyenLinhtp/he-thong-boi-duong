import { Fragment } from "react";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layMaTranPhanQuyen } from "@/server/services/qt/qt-02-phan-quyen";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { OQuyen } from "./o-quyen";

export default async function PhanQuyenPage() {
  try {
    await requirePermission("QT-02");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { chucNangs, vaiTros } = await layMaTranPhanQuyen();

  const nhomTheoNhomChucNang = Map.groupBy(chucNangs, (cn) => cn.nhomChucNang);

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">QT-02 · Phân quyền theo vai trò (RBAC)</h1>
      <p className="text-sm text-muted-foreground">
        Tick/bỏ tick để gán/thu hồi quyền truy cập chức năng cho từng vai trò. Thay đổi có hiệu
        lực từ lần đăng nhập kế tiếp của tài khoản thuộc vai trò đó.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Chức năng</TableHead>
            {vaiTros.map((vt) => (
              <TableHead key={vt.ma} className="text-center">
                {vt.tenHienThi}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...nhomTheoNhomChucNang.entries()].map(([nhom, dsChucNang]) => (
            <Fragment key={nhom}>
              <TableRow>
                <TableCell colSpan={vaiTros.length + 1} className="bg-muted/40 font-medium">
                  {nhom}
                </TableCell>
              </TableRow>
              {dsChucNang.map((cn) => (
                <TableRow key={cn.id}>
                  <TableCell>
                    {cn.maCN} · {cn.tenChucNang}
                  </TableCell>
                  {vaiTros.map((vt) => (
                    <TableCell key={vt.ma} className="text-center">
                      <OQuyen
                        vaiTro={vt.ma}
                        maCN={cn.maCN}
                        coQuyen={vt.maCNDuocPhep.includes(cn.maCN)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

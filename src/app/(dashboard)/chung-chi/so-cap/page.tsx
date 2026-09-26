import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { soCapChungChi } from "@/server/services/cc/cc-04-so-cap";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NHAN_KENH_NHAN } from "@/app/(dashboard)/khoa-hoc/[id]/chung-chi/nhan";

// CC-04: sổ cấp chứng chỉ điện tử - chỉ đọc; hồ sơ lưu vĩnh viễn, không có thao tác sửa/xóa.
export default async function SoCapChungChiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; nam?: string }>;
}) {
  try {
    await requirePermission("CC-04");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { q, nam } = await searchParams;
  const namSo = nam && /^\d{4}$/.test(nam) ? Number(nam) : null;
  const dsChungChi = await soCapChungChi({ tuKhoa: q, nam: namSo });

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">CC-04 · Sổ cấp chứng chỉ</h1>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Họ tên / mã học viên / số hiệu / số vào sổ" className="w-80" />
        <Input name="nam" defaultValue={nam ?? ""} placeholder="Năm cấp (vd 2026)" className="w-36" />
        <Button type="submit" size="sm" variant="secondary">
          Tra cứu
        </Button>
        <span className="text-sm text-muted-foreground">{dsChungChi.length} chứng chỉ</span>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Số vào sổ</TableHead>
            <TableHead>Số hiệu</TableHead>
            <TableHead>Học viên</TableHead>
            <TableHead>Chương trình / khóa</TableHead>
            <TableHead>Quyết định</TableHead>
            <TableHead>Kênh nhận</TableHead>
            <TableHead>Người nhận</TableHead>
            <TableHead>Ngày nhận</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsChungChi.map((cc) => (
            <TableRow key={cc.id}>
              <TableCell className="font-mono">{cc.soVaoSo}</TableCell>
              <TableCell className="font-mono">{cc.soHieu}</TableCell>
              <TableCell>
                {cc.hocVien.hoTen} <span className="text-xs text-muted-foreground">({cc.hocVien.maHocVien})</span>
              </TableCell>
              <TableCell>
                {cc.khoa.chuongTrinh.ten} · {cc.khoa.maKhoa}
              </TableCell>
              <TableCell>
                {cc.soQuyetDinh} ({cc.ngayCap?.toLocaleDateString("vi-VN")})
              </TableCell>
              <TableCell>
                {cc.kenhNhan ? NHAN_KENH_NHAN[cc.kenhNhan] : "—"}
                {cc.banGiao && <span className="ml-1 text-xs text-muted-foreground">({cc.banGiao.maLo})</span>}
              </TableCell>
              <TableCell>{cc.nguoiNhan}</TableCell>
              <TableCell>{cc.ngayNhan?.toLocaleDateString("vi-VN")}</TableCell>
            </TableRow>
          ))}
          {dsChungChi.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                Không có chứng chỉ nào đã vào sổ khớp điều kiện tra cứu
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </main>
  );
}

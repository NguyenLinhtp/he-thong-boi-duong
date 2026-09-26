import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import {
  danhSachLop,
  hocVienTheoLop,
  lichSuChuyenLopCuaKhoa,
} from "@/server/services/kh/kh-07-lop-hoc";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { FormTaoLop, NutChiaTuDong, HangLop, HangHocVienLop } from "./cac-form";

export default async function LopHocPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("KH-07");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { id } = await params;
  const khoa = await layKhoa(id);
  if (!khoa) notFound();

  if (khoa.chuongTrinh.phuongThucDangKy === "CHI_DU_THI") {
    return (
      <p className="p-6 text-muted-foreground">
        Khóa {khoa.maKhoa} thuộc Phương thức 3 (chỉ dự thi) - không có giảng dạy nên không chia lớp.
      </p>
    );
  }

  const [dsLop, dsHocVien, dsLichSu] = await Promise.all([
    danhSachLop(id),
    hocVienTheoLop(id),
    lichSuChuyenLopCuaKhoa(id),
  ]);
  const soChuaXep = dsHocVien.filter((dk) => dk.lopId === null && dk.trangThai === "CHINH_THUC").length;
  const tongSiSoLop = dsLop.reduce((t, l) => t + (l.siSoToiDa ?? 0), 0);

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">KH-07 · Lớp trong khóa {khoa.maKhoa}</h1>
        <a href={`/khoa-hoc/${khoa.id}`} className="text-sm underline">
          Về trang khóa
        </a>
      </div>
      <p className="rounded-lg border p-4 text-sm text-muted-foreground">
        Chuyển lớp chỉ trong cùng khóa và không làm mất điểm, điểm danh, học phí đã có - các dữ liệu
        này gắn theo khóa. Mỗi lớp có thời khóa biểu và giảng viên riêng (chọn lớp khi phân công/xếp
        buổi ở trang khóa); phân công &ldquo;Cả khóa&rdquo; áp dụng cho lớp chưa có phân công riêng. Tổng sĩ số
        các lớp: {tongSiSoLop}/{khoa.siSoToiDa}.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Danh sách lớp</h2>
        <FormTaoLop khoaId={khoa.id} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã lớp</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Sĩ số</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsLop.map((lop) => (
              <HangLop key={lop.id} khoaId={khoa.id} lop={lop} />
            ))}
            {dsLop.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Khóa chưa chia lớp
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Học viên chính thức theo lớp</h2>
        {dsLop.length > 0 && <NutChiaTuDong khoaId={khoa.id} soChuaXep={soChuaXep} />}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã học viên</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Lớp hiện tại</TableHead>
              <TableHead>Xếp / chuyển lớp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsHocVien.map((dk) => (
              <HangHocVienLop
                key={dk.id}
                khoaId={khoa.id}
                dsLop={dsLop}
                hocVien={{
                  dangKyId: dk.id,
                  hoTen: dk.hocVien.hoTen,
                  maHocVien: dk.hocVien.maHocVien,
                  lopId: dk.lopId,
                  maLop: dk.lop?.maLop ?? null,
                }}
              />
            ))}
            {dsHocVien.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Chưa có học viên chính thức (HV-07)
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Lịch sử xếp/chuyển lớp</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời điểm</TableHead>
              <TableHead>Học viên</TableHead>
              <TableHead>Từ lớp</TableHead>
              <TableHead>Sang lớp</TableHead>
              <TableHead>Hiệu lực</TableHead>
              <TableHead>Lý do</TableHead>
              <TableHead>Người thực hiện</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsLichSu.map((ls) => (
              <TableRow key={ls.id}>
                <TableCell>{ls.createdAt.toLocaleString("vi-VN")}</TableCell>
                <TableCell>{ls.dangKy.hocVien.hoTen}</TableCell>
                <TableCell>{ls.tuLop?.maLop ?? "—"}</TableCell>
                <TableCell>{ls.denLop.maLop}</TableCell>
                <TableCell>{ls.ngayHieuLuc.toLocaleDateString("vi-VN")}</TableCell>
                <TableCell>{ls.lyDo ?? ""}</TableCell>
                <TableCell>{ls.nguoiThucHienTen}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}

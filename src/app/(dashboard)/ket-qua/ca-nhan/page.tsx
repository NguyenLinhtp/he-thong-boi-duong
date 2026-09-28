import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { bangDiemCaNhan } from "@/server/services/kq/kq-05-tra-cuu";
import { KhongPhaiTaiKhoanHocVienError } from "@/server/services/kq/loi-ket-qua";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";

export default async function TraCuuDiemPage() {
  let phien;
  try {
    phien = await requirePermission("KQ-05");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  let bang;
  try {
    // KQ-05: chỉ truyền id tài khoản đăng nhập - không có tham số chọn học viên.
    bang = await bangDiemCaNhan(phien.userId);
  } catch (error) {
    if (error instanceof KhongPhaiTaiKhoanHocVienError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <h1 className="text-xl font-bold text-ued-blue-dam">
        KQ-05 · Bảng điểm của {bang.hocVien.hoTen} ({bang.hocVien.maHocVien})
      </h1>
      {bang.khoas.map((k) => (
        <section key={k.khoaId} className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-bold text-ued-blue-dam">
            {k.maKhoa} · {k.tenChuongTrinh}
          </h2>
          {k.diemHocPhan.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Học phần</TableHead>
                  <TableHead>Điểm thành phần</TableHead>
                  <TableHead>Điểm kết thúc</TableHead>
                  <TableHead>Điểm học phần</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {k.diemHocPhan.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.hocPhan.ten}</TableCell>
                    <TableCell>{d.diemThanhPhan?.toString() ?? "—"}</TableCell>
                    <TableCell>{d.diemKetThuc?.toString() ?? "—"}</TableCell>
                    <TableCell>{d.diemHocPhan?.toString() ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {k.ketQuaKhoa ? (
            <p className="text-sm">
              Điểm tổng kết: {k.ketQuaKhoa.diemTongKet?.toString() ?? "—"}
              {k.ketQuaKhoa.tyLeChuyenCan != null && ` · Chuyên cần: ${k.ketQuaKhoa.tyLeChuyenCan.toString()}%`}
              {" · "}
              {k.ketQuaKhoa.daPheDuyet
                ? `${k.ketQuaKhoa.hoanThanh ? "Hoàn thành khóa" : "Chưa hoàn thành"} (QĐ ${k.ketQuaKhoa.soQuyetDinh})`
                : "Kết quả chưa được phê duyệt"}
            </p>
          ) : (
            k.diemHocPhan.length === 0 && <p className="text-sm text-muted-foreground">Chưa có điểm.</p>
          )}
        </section>
      ))}
      {bang.khoas.length === 0 && (
        <p className="text-sm text-muted-foreground">Bạn chưa tham gia khóa nào.</p>
      )}
    </main>
  );
}

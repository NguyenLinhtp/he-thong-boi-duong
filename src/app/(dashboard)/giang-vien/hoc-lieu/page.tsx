import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { hocLieuCuaGiangVien } from "@/server/services/gd/gd-04-hoc-lieu";
import { KhongPhaiTaiKhoanGiangVienError } from "@/server/services/gd/loi-giang-day";
import { layThamSoSo } from "@/server/services/qt/qt-05-tham-so";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { FormDangTaiLieu, NutXoaTaiLieu } from "./cac-form";

const kichThuoc = (byte: number | null) =>
  byte == null ? "" : byte < 1024 * 1024 ? `${Math.ceil(byte / 1024)} KB` : `${(byte / 1024 / 1024).toFixed(1)} MB`;

// GD-04 phía giảng viên: đăng và quản lý học liệu theo học phần phụ trách
export default async function HocLieuGiangVienPage() {
  let phien;
  try {
    phien = await requirePermission("GD-04");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  let duLieu;
  try {
    duLieu = await hocLieuCuaGiangVien(phien.userId);
  } catch (error) {
    if (error instanceof KhongPhaiTaiKhoanGiangVienError) return <p className="p-6 text-destructive">{error.message}</p>;
    throw error;
  }
  const toiDaMb = await layThamSoSo("GD_HOC_LIEU_TOI_DA_MB", 20);

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">GD-04 · Học liệu số của tôi</h1>
      <p className="text-sm text-muted-foreground">
        Tài liệu đăng theo học phần bạn phụ trách. Chọn &quot;cả khóa&quot; (phân công cấp khóa) hoặc lớp cụ thể; chỉ học viên
        trong khóa/lớp đó mới xem và tải được.
      </p>
      <FormDangTaiLieu
        toiDaMb={toiDaMb}
        dsPhanCong={duLieu.dsPhanCong.map((pc) => ({
          giaTri: `${pc.khoaId}|${pc.hocPhanId}|${pc.lopId ?? ""}`,
          nhan: `${pc.khoa.maKhoa} · ${pc.hocPhan.ten} · ${pc.lop ? `lớp ${pc.lop.maLop}` : "cả khóa"}`,
        }))}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tài liệu</TableHead>
            <TableHead>Khóa / học phần</TableHead>
            <TableHead>Phạm vi</TableHead>
            <TableHead>Ngày đăng</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {duLieu.dsTaiLieu.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
                Chưa có tài liệu.
              </TableCell>
            </TableRow>
          )}
          {duLieu.dsTaiLieu.map((tl) => (
            <TableRow key={tl.id}>
              <TableCell>
                <a href={`/api/gd/hoc-lieu/${tl.id}`} className="font-medium underline" target={tl.duongLink ? "_blank" : undefined}>
                  {tl.tieuDe}
                </a>
                <div className="text-xs text-muted-foreground">
                  {tl.duongLink ? "Link" : `${tl.tenFile} · ${kichThuoc(tl.kichThuoc)}`}
                  {tl.moTa ? ` · ${tl.moTa}` : ""}
                </div>
              </TableCell>
              <TableCell>
                {tl.khoa.maKhoa} · {tl.hocPhan.ten}
              </TableCell>
              <TableCell>{tl.lop ? `Lớp ${tl.lop.maLop}` : "Cả khóa"}</TableCell>
              <TableCell>{tl.createdAt.toLocaleDateString("vi-VN")}</TableCell>
              <TableCell>
                <NutXoaTaiLieu id={tl.id} tieuDe={tl.tieuDe} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layHopDong } from "@/server/services/dvlk/dvlk-03-hop-dong";
import { KhongTimThayHopDongDvlkError } from "@/server/services/dvlk/loi-dvlk";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { FormSuaHopDong } from "../cac-form";
import { NHAN_TRANG_THAI_HOP_DONG, NHAN_TRANG_THAI_HO_SO, dinhDangTien } from "../../nhan";

export default async function ChiTietHopDongPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("DVLK-03");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { id } = await params;
  let hd;
  try {
    hd = await layHopDong(id);
  } catch (error) {
    if (error instanceof KhongTimThayHopDongDvlkError) return <p className="p-6 text-destructive">{error.message}</p>;
    throw error;
  }
  const daThanhLy = hd.trangThai === "DA_THANH_LY";

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">
          Hợp đồng {hd.maHopDong}
          <span className="ml-2 rounded border px-2 py-0.5 text-sm font-normal">
            {NHAN_TRANG_THAI_HOP_DONG[hd.trangThai]}
          </span>
        </h1>
        <Link href="/don-vi-lien-ket/hop-dong" className="text-sm underline">
          ← Danh sách hợp đồng
        </Link>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border p-4 text-sm">
        <h2 className="font-semibold">DVLK-03 · Thông tin hợp đồng</h2>
        <p>
          Đơn vị liên kết:{" "}
          <b>
            {hd.donViLienKet.ma} · {hd.donViLienKet.ten}
          </b>
          {" · "}Khóa:{" "}
          <Link href={`/khoa-hoc/${hd.khoa.id}`} className="underline">
            {hd.khoa.maKhoa} · {hd.khoa.chuongTrinh.ten}
          </Link>
        </p>
        <p>
          Số học viên dự kiến: <b>{hd.soLuongDuKien ?? "—"}</b> · thực tế: <b>{hd.thucTe}</b>
          {" · "}Đơn giá thỏa thuận: <b>{dinhDangTien(hd.donGiaThoaThuan)}</b>
        </p>
        <p className="text-xs text-muted-foreground">
          Thực tế = hồ sơ gắn hợp đồng, không tính hồ sơ bị hủy do quá hạn thu hồ sơ hoặc không hợp lệ.
        </p>
        {daThanhLy ? (
          <p>
            Đã thanh lý{hd.ngayQuyetToan ? ` ngày ${hd.ngayQuyetToan.toLocaleDateString("vi-VN")}` : ""} · số tiền
            quyết toán: <b>{dinhDangTien(hd.soTienQuyetToan)}</b>
          </p>
        ) : (
          <FormSuaHopDong
            id={hd.id}
            soLuongDuKien={hd.soLuongDuKien}
            donGiaThoaThuan={hd.donGiaThoaThuan === null ? null : Number(hd.donGiaThoaThuan)}
            ghiChu={hd.ghiChu}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Học viên theo hợp đồng ({hd.dangKys.length})</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(hd.theoTrangThai).map(([trangThai, so]) => (
            <span key={trangThai} className="rounded border px-2 py-0.5">
              {NHAN_TRANG_THAI_HO_SO[trangThai] ?? trangThai}: {so}
            </span>
          ))}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã học viên</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Ngày đăng ký</TableHead>
              <TableHead>Trạng thái hồ sơ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hd.dangKys.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Chưa có học viên đăng ký qua hợp đồng này.
                </TableCell>
              </TableRow>
            )}
            {hd.dangKys.map((dk) => (
              <TableRow key={dk.id}>
                <TableCell>{dk.hocVien.maHocVien}</TableCell>
                <TableCell>{dk.hocVien.hoTen}</TableCell>
                <TableCell>{dk.ngayDangKy.toLocaleDateString("vi-VN")}</TableCell>
                <TableCell>{NHAN_TRANG_THAI_HO_SO[dk.trangThai] ?? dk.trangThai}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachHopDong, tuyChonLapHopDong } from "@/server/services/dvlk/dvlk-03-hop-dong";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";
import { FormTaoHopDong } from "./cac-form";
import { NHAN_TRANG_THAI_HOP_DONG, dinhDangTien } from "../nhan";

export default async function HopDongLienKetPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; trangThai?: string; donVi?: string }>;
}) {
  try {
    await requirePermission("DVLK-03");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const { q, trangThai, donVi } = await searchParams;
  const [dsHopDong, { dsDonVi, dsKhoa }] = await Promise.all([
    danhSachHopDong({
      tuKhoa: q,
      donViLienKetId: donVi,
      trangThai: trangThai === "DANG_TRIEN_KHAI" || trangThai === "DA_THANH_LY" ? trangThai : null,
    }),
    tuyChonLapHopDong(),
  ]);

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ued-blue-dam">DVLK-03 · Hợp đồng liên kết tuyển sinh theo khóa</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/don-vi-lien-ket/bao-cao" className="underline">
            Báo cáo công nợ, doanh thu (DVLK-07)
          </Link>
          <Link href="/don-vi-lien-ket" className="underline">
            Danh mục đơn vị liên kết →
          </Link>
        </div>
      </div>

      <FormTaoHopDong
        dsDonVi={dsDonVi.map((dv) => ({ id: dv.id, ma: dv.ma, ten: dv.ten }))}
        dsKhoa={dsKhoa.map((k) => ({ id: k.id, maKhoa: k.maKhoa, tenChuongTrinh: k.chuongTrinh.ten }))}
        donViMacDinh={donVi}
      />

      <form method="get" className="flex flex-wrap items-end gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Mã hợp đồng, đơn vị, mã khóa" className="w-72" />
        <select name="trangThai" defaultValue={trangThai ?? ""} className="h-8 rounded-lg border px-2 text-sm">
          <option value="">Mọi trạng thái</option>
          <option value="DANG_TRIEN_KHAI">Đang triển khai</option>
          <option value="DA_THANH_LY">Đã thanh lý</option>
        </select>
        <button type="submit" className="h-8 rounded-lg border bg-white px-3 text-sm hover:bg-muted">
          Lọc
        </button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã hợp đồng</TableHead>
            <TableHead>Đơn vị liên kết</TableHead>
            <TableHead>Khóa</TableHead>
            <TableHead>Dự kiến / thực tế</TableHead>
            <TableHead>Đơn giá thỏa thuận</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsHopDong.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                Chưa có hợp đồng phù hợp.
              </TableCell>
            </TableRow>
          )}
          {dsHopDong.map((hd) => (
            <TableRow key={hd.id}>
              <TableCell>
                <Link href={`/don-vi-lien-ket/hop-dong/${hd.id}`} className="font-medium underline">
                  {hd.maHopDong}
                </Link>
              </TableCell>
              <TableCell>
                {hd.donViLienKet.ma} · {hd.donViLienKet.ten}
              </TableCell>
              <TableCell>
                {hd.khoa.maKhoa} · {hd.khoa.chuongTrinh.ten}
              </TableCell>
              <TableCell>
                {hd.soLuongDuKien ?? "—"} / {hd.thucTe}
              </TableCell>
              <TableCell>{dinhDangTien(hd.donGiaThoaThuan)}</TableCell>
              <TableCell><NhanTrangThai ma={hd.trangThai}>{NHAN_TRANG_THAI_HOP_DONG[hd.trangThai] ?? hd.trangThai}</NhanTrangThai></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachDonViLienKet } from "@/server/services/dvlk/dvlk-01-danh-muc";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";
import { FormTaoDonViLienKet } from "./cac-form";
import { NHAN_TRANG_THAI_HOP_TAC } from "./nhan";

export default async function DonViLienKetPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; trangThai?: string }>;
}) {
  try {
    await requirePermission("DVLK-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const { q, trangThai } = await searchParams;
  const dsDonVi = await danhSachDonViLienKet({
    tuKhoa: q,
    trangThaiHopTac: trangThai === "DANG_HOP_TAC" || trangThai === "TAM_NGUNG" ? trangThai : null,
  });

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ued-blue-dam">DVLK-01 · Danh mục đơn vị liên kết</h1>
      </div>
      <FormTaoDonViLienKet />

      <form method="get" className="flex flex-wrap items-end gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Tìm theo mã, tên, người đại diện, liên hệ" className="w-80" />
        <select name="trangThai" defaultValue={trangThai ?? ""} className="h-8 rounded-lg border px-2 text-sm">
          <option value="">Mọi trạng thái hợp tác</option>
          <option value="DANG_HOP_TAC">Đang hợp tác</option>
          <option value="TAM_NGUNG">Tạm ngừng</option>
        </select>
        <button type="submit" className="h-8 rounded-lg border bg-white px-3 text-sm hover:bg-muted">
          Tra cứu
        </button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã</TableHead>
            <TableHead>Tên đơn vị</TableHead>
            <TableHead>Người đại diện</TableHead>
            <TableHead>Liên hệ</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Hợp đồng (chưa thanh lý / tổng)</TableHead>
            <TableHead>Tài khoản</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsDonVi.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground">
                Không có đơn vị liên kết phù hợp.
              </TableCell>
            </TableRow>
          )}
          {dsDonVi.map((dv) => (
            <TableRow key={dv.id}>
              <TableCell>
                <Link href={`/don-vi-lien-ket/${dv.id}`} className="font-medium underline">
                  {dv.ma}
                </Link>
              </TableCell>
              <TableCell>{dv.ten}</TableCell>
              <TableCell>{dv.nguoiDaiDien ?? "—"}</TableCell>
              <TableCell>{[dv.soDienThoai, dv.email].filter(Boolean).join(" · ") || "—"}</TableCell>
              <TableCell><NhanTrangThai ma={dv.trangThaiHopTac}>{NHAN_TRANG_THAI_HOP_TAC[dv.trangThaiHopTac] ?? dv.trangThaiHopTac}</NhanTrangThai></TableCell>
              <TableCell>
                {dv.hopDongs.filter((hd) => hd.trangThai !== "DA_THANH_LY").length} / {dv.hopDongs.length}
              </TableCell>
              <TableCell>{dv.taiKhoan?.tenDangNhap ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

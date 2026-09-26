import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layDonViLienKet } from "@/server/services/dvlk/dvlk-01-danh-muc";
import { KhongTimThayDonViLienKetError } from "@/server/services/dvlk/loi-dvlk";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { FormSuaDonViLienKet, NutTrangThaiHopTac, NutXoaDonViLienKet } from "../cac-form";
import { NHAN_TRANG_THAI_HOP_TAC, NHAN_TRANG_THAI_HOP_DONG } from "../nhan";

export default async function ChiTietDonViLienKetPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("DVLK-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { id } = await params;
  let dv;
  try {
    dv = await layDonViLienKet(id);
  } catch (error) {
    if (error instanceof KhongTimThayDonViLienKetError) return <p className="p-6 text-destructive">{error.message}</p>;
    throw error;
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">
          Đơn vị liên kết {dv.ma} · {dv.ten}
          <span className="ml-2 rounded border px-2 py-0.5 text-sm font-normal">
            {NHAN_TRANG_THAI_HOP_TAC[dv.trangThaiHopTac]}
          </span>
        </h1>
        <Link href="/don-vi-lien-ket" className="text-sm underline">
          ← Danh mục đơn vị liên kết
        </Link>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">DVLK-01 · Thông tin đơn vị</h2>
        <FormSuaDonViLienKet dv={dv} />
        <div className="flex flex-wrap items-start gap-3">
          <NutTrangThaiHopTac id={dv.id} dangHopTac={dv.trangThaiHopTac === "DANG_HOP_TAC"} />
          <NutXoaDonViLienKet id={dv.id} ten={dv.ten} />
        </div>
        <p className="text-xs text-muted-foreground">
          Tạm ngừng hợp tác: không lập hợp đồng liên kết mới, hợp đồng đang có vẫn theo dõi và thanh lý
          bình thường. Không xóa được đơn vị đã có hợp đồng.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Hợp đồng liên kết</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã hợp đồng</TableHead>
              <TableHead>Khóa</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dv.hopDongs.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  Chưa có hợp đồng.
                </TableCell>
              </TableRow>
            )}
            {dv.hopDongs.map((hd) => (
              <TableRow key={hd.id}>
                <TableCell>{hd.maHopDong}</TableCell>
                <TableCell>
                  {hd.khoa.maKhoa} · {hd.khoa.chuongTrinh.ten}
                </TableCell>
                <TableCell>{NHAN_TRANG_THAI_HOP_DONG[hd.trangThai]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}

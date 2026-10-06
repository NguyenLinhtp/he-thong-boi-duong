import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { phamViHoSoHocVien, trangHoSoHocVien } from "@/server/services/hv/hv-08-ho-so-hoc-vien";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { OTimKiem, PhanTrang, SO_DONG_MOI_TRANG, thamSoDanhSach, thamSoPhang, viTriTrang, type ThamSoUrl } from "@/components/chung/phan-trang";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";

export default async function HocVienPage({
  searchParams,
}: {
  searchParams: Promise<ThamSoUrl>;
}) {
  let phien;
  try {
    phien = await requirePermission("HV-08");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const sp = await searchParams;
  const ten = thamSoDanhSach("hv");
  const thamSo = thamSoPhang(sp);
  const q = (thamSo[ten.q] ?? "").trim();
  const phamVi = await phamViHoSoHocVien(phien.userId);
  // học viên: chỉ có hồ sơ của chính mình -> vào thẳng
  if (!phamVi.toanBo) {
    if (phamVi.hocVienId) redirect(`/hoc-vien/${phamVi.hocVienId}`);
    return <p className="p-6 text-muted-foreground">Tài khoản chưa được liên kết với hồ sơ học viên nào.</p>;
  }
  // (bổ sung 06/10/2026) phân trang 20 dòng trong CSDL; tìm theo họ tên/mã học viên/mã SV/CCCD
  const { tong } = await trangHoSoHocVien(q || undefined, phamVi, 0, 0);
  const vt = viTriTrang(tong, thamSo[ten.trang]);
  const { ds: dsHocVien } = await trangHoSoHocVien(q || undefined, phamVi, vt.tuDong, SO_DONG_MOI_TRANG);

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <h1 className="text-xl font-bold text-ued-blue-dam">HV-08 · Hồ sơ học viên</h1>

      <OTimKiem duong="/hoc-vien" thamSo={thamSo} ma="hv" tuKhoa={q} ketQua={tong} goiY="Họ tên / mã học viên / mã SV / CCCD" />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã học viên</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>CCCD</TableHead>
            <TableHead>Đơn vị công tác</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsHocVien.map((hv) => (
            <TableRow key={hv.id}>
              <TableCell>{hv.maHocVien}</TableCell>
              <TableCell>{hv.hoTen}</TableCell>
              <TableCell>{hv.soCCCD ?? "—"}</TableCell>
              <TableCell>{hv.donViCongTac ?? "—"}</TableCell>
              <TableCell>
                <Link href={`/hoc-vien/${hv.id}`} className="text-sm text-primary underline">
                  Xem hồ sơ
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {dsHocVien.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Không tìm thấy học viên phù hợp
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <PhanTrang duong="/hoc-vien" thamSo={thamSo} ten={ten.trang} trang={vt.trang} tongTrang={vt.tongTrang} tongDong={tong} />
    </main>
  );
}

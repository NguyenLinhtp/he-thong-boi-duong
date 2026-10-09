import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachSinhVien, layCotBoSungSinhVien } from "@/server/services/hv/hv-03-danh-sach-sinh-vien";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { OTimKiem, PhanTrang, soDongTuUrl, thamSoDanhSach, thamSoPhang, viTriTrang, type ThamSoUrl } from "@/components/chung/phan-trang";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { TrangThaiRong } from "@/components/chung/trang-thai-rong";
import { FormImportSinhVien } from "@/components/dang-ky/form-import-sinh-vien";
import { CauHinhCotSinhVien } from "@/components/dang-ky/cau-hinh-cot-sinh-vien";

// (bổ sung 01/10/2026 - HV-03) danh sách sinh viên của trường - nguồn tra cứu khi đăng ký dự thi bằng mã sinh viên
export default async function DanhSachSinhVienPage({ searchParams }: { searchParams: Promise<ThamSoUrl> }) {
  try {
    await requirePermission("HV-03");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }
  const sp = await searchParams;
  const ten = thamSoDanhSach("sv");
  const thamSo = thamSoPhang(sp);
  const q = (thamSo[ten.q] ?? "").trim();
  // (bổ sung 06/10/2026) phân trang 20 dòng trong CSDL thay cho giới hạn 200 dòng đầu
  const [{ tong }, dsCot] = await Promise.all([danhSachSinhVien(q, 0), layCotBoSungSinhVien()]);
  const vt = viTriTrang(tong, thamSo[ten.trang], soDongTuUrl(thamSo, ten.trang));
  const { ds } = await danhSachSinhVien(q, vt.soDong, vt.tuDong);

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <div>
        <h1 className="text-xl font-bold text-ued-blue-dam">Danh sách sinh viên</h1>
        <p className="text-sm text-muted-foreground">
          Dữ liệu thí sinh có sẵn của trường. Khi đăng ký dự thi (chương trình định danh bằng mã sinh viên), thí sinh
          nhập mã sinh viên để hệ thống tự điền họ tên, lớp. Mỗi lần có tệp bổ sung thì nạp thêm; mã sinh viên đã có chỉ bị ghi đè khi bạn xác nhận.
        </p>
      </div>

      <CauHinhCotSinhVien dsCot={dsCot} />
      <FormImportSinhVien dsCot={dsCot} />

      <OTimKiem duong="/hoc-vien/sinh-vien" thamSo={thamSo} ma="sv" tuKhoa={q} ketQua={tong} goiY="Mã sinh viên / họ tên / lớp / CCCD" />

      {ds.length === 0 ? (
        <TrangThaiRong>{q ? "Không có sinh viên phù hợp" : "Chưa nạp danh sách sinh viên nào"}</TrangThaiRong>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {tong.toLocaleString("vi-VN")} sinh viên{q && ` khớp "${q}"`}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã sinh viên</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Số CCCD</TableHead>
                <TableHead>Lớp sinh hoạt</TableHead>
                {dsCot.map((c) => (
                  <TableHead key={c.ma}>{c.nhan}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ds.map((sv) => (
                <TableRow key={sv.id}>
                  <TableCell className="font-mono">{sv.maSinhVien}</TableCell>
                  <TableCell>{sv.hoTen}</TableCell>
                  <TableCell className="font-mono">{sv.soCCCD}</TableCell>
                  <TableCell>{sv.lopSinhHoat ?? "—"}</TableCell>
                  {dsCot.map((c) => (
                    <TableCell key={c.ma}>{sv.thongTinThem[c.ma] || "—"}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PhanTrang duong="/hoc-vien/sinh-vien" thamSo={thamSo} ten={ten.trang} trang={vt.trang} tongTrang={vt.tongTrang} tongDong={tong} soDong={vt.soDong} />
        </>
      )}
    </main>
  );
}

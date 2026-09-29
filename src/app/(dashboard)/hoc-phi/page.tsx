import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { baoCaoCongNo } from "@/server/services/hp/hp-05-bao-cao";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";
import { TrangThaiRong } from "@/components/chung/trang-thai-rong";
import { dinhDangTien } from "@/lib/dinh-dang";

const NHAN_TRANG_THAI_KHOA: Record<string, string> = {
  CHUAN_BI: "Chuẩn bị",
  DANG_TUYEN_SINH: "Đang tuyển sinh",
  DANG_DIEN_RA: "Đang diễn ra",
  DA_KET_THUC: "Đã kết thúc",
};

// Lối vào học phí theo khóa (HP-01..04) cho cán bộ tài chính - không cần quyền quản lý khóa KH-01
export default async function HocPhiTheoKhoaPage() {
  try {
    await requirePermission("HP-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }

  const [dsKhoa, congNo] = await Promise.all([danhSachKhoa(), baoCaoCongNo()]);
  const noTheoKhoa = new Map(congNo.theoKhoa.map((k) => [k.maKhoa, k]));
  const hienThi = dsKhoa.filter((k) => k.trangThai !== "HUY");

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <div>
        <h1 className="text-xl font-bold text-ued-blue-dam">Học phí theo khóa</h1>
        <p className="text-sm text-muted-foreground">
          Chọn khóa để thiết lập mức học phí, ghi nhận thanh toán, theo dõi công nợ và lập phiếu thu.
        </p>
      </div>
      {hienThi.length === 0 ? (
        <TrangThaiRong>Chưa có khóa bồi dưỡng nào</TrangThaiRong>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khóa</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Mức học phí</TableHead>
              <TableHead>Học viên còn nợ</TableHead>
              <TableHead>Tổng còn nợ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hienThi.map((k) => {
              const no = noTheoKhoa.get(k.maKhoa);
              return (
                <TableRow key={k.id}>
                  <TableCell>
                    <Link href={`/khoa-hoc/${k.id}/hoc-phi`} className="font-medium underline">
                      {k.maKhoa}
                    </Link>
                    <div className="text-xs text-muted-foreground">{k.chuongTrinh.ten}</div>
                  </TableCell>
                  <TableCell>
                    <NhanTrangThai ma={k.trangThai}>{NHAN_TRANG_THAI_KHOA[k.trangThai] ?? k.trangThai}</NhanTrangThai>
                  </TableCell>
                  <TableCell>{dinhDangTien(k.mucHocPhi)}</TableCell>
                  <TableCell>{no?.soHocVien ?? 0}</TableCell>
                  <TableCell className={no ? "font-medium text-warning" : undefined}>
                    {no ? dinhDangTien(no.soConNo) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </main>
  );
}

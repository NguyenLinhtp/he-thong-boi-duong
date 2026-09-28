import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { tinhTrangSiSo } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { cn } from "@/lib/utils";
import { DauTrangThemMoi } from "@/components/chung/dau-trang-them-moi";
import { timKiemChuongTrinh } from "@/server/services/ct/ct-05-tra-cuu";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";
import { FormTaoKhoa } from "./form-tao-khoa";

const NHAN_TRANG_THAI: Record<string, string> = {
  CHUAN_BI: "Chuẩn bị",
  DANG_TUYEN_SINH: "Đang tuyển sinh",
  DANG_DIEN_RA: "Đang diễn ra",
  DA_KET_THUC: "Đã kết thúc",
  HUY: "Hủy",
};

// sĩ số hiện tại/tối đa kèm thanh tỷ lệ (tham khảo cột "học viên/sĩ số" ở taphuan)
function SiSo({ hienTai, toiDa }: { hienTai: number; toiDa: number }) {
  const tyLe = toiDa > 0 ? Math.min(100, Math.round((hienTai / toiDa) * 100)) : 0;
  return (
    <div className="flex min-w-24 flex-col gap-1">
      <span className="text-sm">
        {hienTai}/{toiDa}
      </span>
      <span className="h-1.5 rounded-full bg-muted">
        <span className={cn("block h-1.5 rounded-full", tyLe >= 100 ? "bg-warning" : "bg-ued-blue")} style={{ width: `${tyLe}%` }} />
      </span>
    </div>
  );
}

const BO_LOC = ["DANG_TUYEN_SINH", "DANG_DIEN_RA", "CHUAN_BI", "DA_KET_THUC", "HUY"] as const;

export default async function KhoaHocPage({ searchParams }: { searchParams: Promise<{ trangThai?: string }> }) {
  try {
    await requirePermission("KH-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const { trangThai } = await searchParams;
  const loc = (BO_LOC as readonly string[]).includes(trangThai ?? "") ? trangThai : undefined;
  const [tatCaKhoa, dsChuongTrinhDaBanHanh] = await Promise.all([
    danhSachKhoa(),
    timKiemChuongTrinh({ trangThai: "DA_BAN_HANH" }),
  ]);
  const dsKhoa = loc ? tatCaKhoa.filter((k) => k.trangThai === loc) : tatCaKhoa;
  const siSo = new Map(await Promise.all(dsKhoa.map(async (k) => [k.id, await tinhTrangSiSo(k.id)] as const)));
  const demTheoTrangThai = (tt: string) => tatCaKhoa.filter((k) => k.trangThai === tt).length;
  const tieuDe = <h1 className="text-xl font-bold text-ued-blue-dam">Khóa bồi dưỡng</h1>;

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <DauTrangThemMoi tieuDe={tieuDe} nhanNut="Mở khóa mới">
        {dsChuongTrinhDaBanHanh.length > 0 ? (
          <FormTaoKhoa
            dsChuongTrinh={dsChuongTrinhDaBanHanh.map((ct) => ({
              id: ct.id,
              maCT: ct.maCT,
              ten: ct.ten,
            }))}
          />
        ) : (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground shadow-sm">
            Chưa có chương trình nào ở trạng thái Đã ban hành để khởi tạo khóa.
          </p>
        )}
      </DauTrangThemMoi>

      <nav aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
        {[undefined, ...BO_LOC].map((tt) => (
          <Link
            key={tt ?? "tat-ca"}
            href={tt ? `/khoa-hoc?trangThai=${tt}` : "/khoa-hoc"}
            aria-current={tt === loc ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              tt === loc ? "border-primary bg-primary text-primary-foreground" : "bg-white text-foreground hover:bg-muted",
            )}
          >
            {tt ? NHAN_TRANG_THAI[tt] : "Tất cả"} ({tt ? demTheoTrangThai(tt) : tatCaKhoa.length})
          </Link>
        ))}
      </nav>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã khóa</TableHead>
            <TableHead>Chương trình</TableHead>
            <TableHead>Khai giảng</TableHead>
            <TableHead>Bế giảng</TableHead>
            <TableHead>Sĩ số</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsKhoa.map((khoa) => (
            <TableRow key={khoa.id}>
              <TableCell>
                <Link href={`/khoa-hoc/${khoa.id}`} className="font-medium">
                  {khoa.maKhoa}
                </Link>
              </TableCell>
              <TableCell className="max-w-md truncate" title={khoa.chuongTrinh.ten}>
                {khoa.chuongTrinh.ten}
              </TableCell>
              <TableCell>
                {khoa.thoiGianKhaiGiang
                  ? new Date(khoa.thoiGianKhaiGiang).toLocaleDateString("vi-VN")
                  : "—"}
              </TableCell>
              <TableCell>
                {khoa.thoiGianBeGiang
                  ? new Date(khoa.thoiGianBeGiang).toLocaleDateString("vi-VN")
                  : "—"}
              </TableCell>
              <TableCell>
                <SiSo hienTai={siSo.get(khoa.id)!.siSoHienTai} toiDa={khoa.siSoToiDa} />
              </TableCell>
              <TableCell><NhanTrangThai ma={khoa.trangThai}>{NHAN_TRANG_THAI[khoa.trangThai] ?? khoa.trangThai}</NhanTrangThai></TableCell>
              <TableCell>
                <Link href={`/khoa-hoc/${khoa.id}`} className="text-sm">
                  Chi tiết →
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {dsKhoa.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                {loc ? "Không có khóa ở trạng thái này" : "Chưa có khóa bồi dưỡng nào"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </main>
  );
}

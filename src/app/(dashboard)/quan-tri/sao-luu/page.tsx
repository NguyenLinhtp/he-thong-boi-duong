import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachSaoLuu } from "@/server/services/qt/qt-04-sao-luu";
import { Table, TableHeader, TableBody, TableHead, TableRow } from "@/components/ui/table";
import { HangSaoLuu } from "./hang-sao-luu";
import { NutBackupNgay } from "./nut-backup-ngay";

export default async function SaoLuuPage() {
  try {
    await requirePermission("QT-04");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const banGhis = await danhSachSaoLuu();

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">QT-04 · Sao lưu và phục hồi dữ liệu</h1>
        <NutBackupNgay />
      </div>
      <p className="text-sm text-muted-foreground">
        Sao lưu tối thiểu hằng ngày, tự động giữ lại tối đa 30 bản gần nhất. Ngoài nút &quot;Sao
        lưu ngay&quot; ở đây, có thể cấu hình bộ lập lịch (Windows Task Scheduler/cron) gọi
        <code className="mx-1 rounded bg-muted px-1">POST /api/qt/sao-luu-tu-dong</code>
        hằng ngày kèm header <code className="mx-1 rounded bg-muted px-1">x-backup-cron-secret</code>
        đúng biến môi trường <code className="rounded bg-muted px-1">BACKUP_CRON_SECRET</code>.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thời gian bắt đầu</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Người kích hoạt</TableHead>
            <TableHead>Dung lượng</TableHead>
            <TableHead>Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {banGhis.map((b) => (
            <HangSaoLuu
              key={b.id}
              banGhi={{
                id: b.id,
                thoiGianBatDau: b.thoiGianBatDau.toISOString(),
                thoiGianKetThuc: b.thoiGianKetThuc?.toISOString() ?? null,
                trangThai: b.trangThai,
                loaiKichHoat: b.loaiKichHoat,
                nguoiKichHoat: b.nguoiKichHoat,
                kichThuocByte: b.kichThuocByte,
                loiChiTiet: b.loiChiTiet,
              }}
            />
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

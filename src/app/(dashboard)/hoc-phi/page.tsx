import Link from "next/link";
import Form from "next/form";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { tongHopHocPhiTheoKhoa } from "@/server/services/hp/hp-05-bao-cao";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";
import { TrangThaiRong } from "@/components/chung/trang-thai-rong";
import { PhanTrang, catTrang, thamSoPhang, type ThamSoUrl } from "@/components/chung/phan-trang";
import { dinhDangTien } from "@/lib/dinh-dang";

const NHAN_TRANG_THAI_KHOA: Record<string, string> = {
  CHUAN_BI: "Chuẩn bị",
  DANG_TUYEN_SINH: "Đang tuyển sinh",
  DANG_DIEN_RA: "Đang diễn ra",
  DA_KET_THUC: "Đã kết thúc",
};

const DUONG = "/hoc-phi";

// Lối vào học phí theo khóa (HP-01..04) cho cán bộ tài chính - không cần quyền quản lý khóa KH-01.
// (sửa 06/10/2026) lọc theo chương trình (chương trình -> khóa); bỏ cột mức học phí (1 khóa có
// thể có nhiều mức theo đối tượng); hiện số đăng ký / đã xác nhận / còn nợ / tổng tiền đã thu.
export default async function HocPhiTheoKhoaPage({ searchParams }: { searchParams: Promise<ThamSoUrl> }) {
  try {
    await requirePermission("HP-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }

  const thamSo = thamSoPhang(await searchParams);
  const tatCa = (await danhSachKhoa()).filter((k) => k.trangThai !== "HUY");
  const dsChuongTrinh = [...new Map(tatCa.map((k) => [k.chuongTrinh.id, k.chuongTrinh])).values()].sort((a, b) =>
    a.ten.localeCompare(b.ten, "vi"),
  );
  const ctChon = dsChuongTrinh.find((ct) => ct.id === thamSo.ct)?.id;
  const loc = ctChon ? tatCa.filter((k) => k.chuongTrinh.id === ctChon) : tatCa;
  const trang = catTrang(loc, thamSo.kh_trang);
  const tongHop = await tongHopHocPhiTheoKhoa(trang.dsTrang.map((k) => k.id));

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <div>
        <h1 className="text-xl font-bold text-ued-blue-dam">Học phí theo khóa</h1>
        <p className="text-sm text-muted-foreground">
          Chọn khóa để ghi nhận thanh toán, đối soát lệ phí, theo dõi công nợ và lập phiếu thu.
        </p>
      </div>

      <Form action={DUONG} scroll={false} prefetch={false} className="flex flex-wrap items-center gap-2">
        <label htmlFor="ct" className="text-sm font-medium">
          Chương trình
        </label>
        <select
          id="ct"
          name="ct"
          defaultValue={ctChon ?? ""}
          className="h-8 max-w-full min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm sm:max-w-md"
        >
          <option value="">Tất cả chương trình ({tatCa.length} khóa)</option>
          {dsChuongTrinh.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {ct.maCT} · {ct.ten}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary">
          Lọc
        </Button>
        {ctChon && (
          <Link href={DUONG} className="text-xs underline">
            Bỏ lọc
          </Link>
        )}
      </Form>

      {loc.length === 0 ? (
        <TrangThaiRong>Chưa có khóa bồi dưỡng nào</TrangThaiRong>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khóa</TableHead>
                  <TableHead>Tên chương trình</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Tổng số học viên đăng ký</TableHead>
                  <TableHead className="text-right">Học viên đã xác nhận học phí</TableHead>
                  <TableHead className="text-right">Học viên còn nợ học phí</TableHead>
                  <TableHead className="text-right">Tổng tiền đã thu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trang.dsTrang.map((k) => {
                  const t = tongHop.get(k.id)!;
                  return (
                    <TableRow key={k.id}>
                      <TableCell>
                        <Link href={`/khoa-hoc/${k.id}/hoc-phi`} className="font-medium text-primary underline">
                          {k.maKhoa}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-80">
                        {k.chuongTrinh.ten}
                        {k.tenKhoa && <span className="block text-xs text-muted-foreground">{k.tenKhoa}</span>}
                      </TableCell>
                      <TableCell>
                        <NhanTrangThai ma={k.trangThai}>{NHAN_TRANG_THAI_KHOA[k.trangThai] ?? k.trangThai}</NhanTrangThai>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{t.soDangKy}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.soDaXacNhan}</TableCell>
                      <TableCell className={t.soConNo > 0 ? "text-right font-medium text-warning tabular-nums" : "text-right tabular-nums"}>
                        {t.soConNo}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{dinhDangTien(t.daThu)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <PhanTrang duong={DUONG} thamSo={thamSo} ten="kh_trang" trang={trang.trang} tongTrang={trang.tongTrang} tongDong={trang.tongDong} />
        </>
      )}
    </main>
  );
}

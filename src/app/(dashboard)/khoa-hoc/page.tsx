import Link from "next/link";
import Form from "next/form";
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
import { NutXoaKhoa } from "./nut-xoa-khoa";
import { Button } from "@/components/ui/button";
import { PhanTrang, catTrang, soDongTuUrl } from "@/components/chung/phan-trang";

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

export default async function KhoaHocPage({
  searchParams,
}: {
  searchParams: Promise<{ trangThai?: string; ct?: string; trang?: string; so?: string }>;
}) {
  try {
    await requirePermission("KH-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const sp = await searchParams;
  const loc = (BO_LOC as readonly string[]).includes(sp.trangThai ?? "") ? sp.trangThai : undefined;
  const [moiKhoa, dsChuongTrinhDaBanHanh] = await Promise.all([
    danhSachKhoa(),
    timKiemChuongTrinh({ trangThai: "DA_BAN_HANH" }),
  ]);
  // (bổ sung 08/10/2026) lọc theo chương trình (kết hợp lọc trạng thái), phân trang có nhập số dòng
  const dsChuongTrinh = [...new Map(moiKhoa.map((k) => [k.chuongTrinh.id, k.chuongTrinh])).values()].sort((a, b) =>
    a.maCT.localeCompare(b.maCT),
  );
  const ctChon = dsChuongTrinh.find((ct) => ct.id === sp.ct)?.id;
  const tatCaKhoa = ctChon ? moiKhoa.filter((k) => k.chuongTrinh.id === ctChon) : moiKhoa;
  const dsLoc = loc ? tatCaKhoa.filter((k) => k.trangThai === loc) : tatCaKhoa;
  const trang = catTrang(dsLoc, sp.trang, soDongTuUrl(sp, "trang"));
  const dsKhoa = trang.dsTrang;
  const siSo = new Map(await Promise.all(dsKhoa.map(async (k) => [k.id, await tinhTrangSiSo(k.id)] as const)));
  const demTheoTrangThai = (tt: string) => tatCaKhoa.filter((k) => k.trangThai === tt).length;
  const thamSo = { trangThai: loc, ct: ctChon, so: sp.so };
  const hrefTrangThai = (tt?: string) => {
    const q = new URLSearchParams(Object.entries({ trangThai: tt, ct: ctChon, so: sp.so }).filter(([, v]) => v) as [string, string][]).toString();
    return `/khoa-hoc${q ? `?${q}` : ""}`;
  };
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

      <Form action="/khoa-hoc" scroll={false} prefetch={false} className="flex flex-wrap items-center gap-2">
        {loc && <input type="hidden" name="trangThai" value={loc} />}
        <label htmlFor="ct" className="text-sm font-medium">
          Chương trình
        </label>
        <select
          id="ct"
          name="ct"
          defaultValue={ctChon ?? ""}
          className="h-8 max-w-full min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm sm:max-w-md"
        >
          <option value="">Tất cả chương trình ({moiKhoa.length} khóa)</option>
          {dsChuongTrinh.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {ct.maCT} · {ct.ten} ({moiKhoa.filter((k) => k.chuongTrinh.id === ct.id).length})
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary">
          Lọc
        </Button>
        {ctChon && (
          <Link href={hrefTrangThai(loc)} className="text-xs underline">
            Bỏ lọc chương trình
          </Link>
        )}
      </Form>

      <nav aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
        {[undefined, ...BO_LOC].map((tt) => (
          <Link
            key={tt ?? "tat-ca"}
            href={hrefTrangThai(tt)}
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
            <TableHead>Tên khóa · chương trình</TableHead>
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
              <TableCell className="max-w-md">
                {khoa.tenKhoa ? (
                  <>
                    <span className="block truncate font-medium" title={khoa.tenKhoa}>
                      {khoa.tenKhoa}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground" title={khoa.chuongTrinh.ten}>
                      {khoa.chuongTrinh.ten}
                    </span>
                  </>
                ) : (
                  <span className="block truncate" title={khoa.chuongTrinh.ten}>
                    {khoa.chuongTrinh.ten}
                  </span>
                )}
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
                <div className="flex items-center justify-end gap-3">
                  <Link href={`/khoa-hoc/${khoa.id}`} className="text-sm whitespace-nowrap">
                    Chi tiết →
                  </Link>
                  {/* (bổ sung 06/10/2026) xóa khóa tạo sai - chỉ hiện khi chưa có hồ sơ đăng ký */}
                  {khoa._count.dangKys === 0 && <NutXoaKhoa khoaId={khoa.id} ten={`${khoa.maKhoa} · ${khoa.tenKhoa ?? khoa.chuongTrinh.ten}`} />}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {dsKhoa.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                {loc || ctChon ? "Không có khóa phù hợp bộ lọc" : "Chưa có khóa bồi dưỡng nào"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <PhanTrang duong="/khoa-hoc" thamSo={thamSo} ten="trang" trang={trang.trang} tongTrang={trang.tongTrang} tongDong={trang.tongDong} soDong={trang.soDong} />
    </main>
  );
}

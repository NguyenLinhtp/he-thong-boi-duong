import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import {
  baoCaoHoatDongDaoTao,
  docLocBaoCaoDaoTao,
  NHAN_TRANG_THAI_KHOA,
} from "@/server/services/bc/bc-02-bao-cao-dao-tao";
import { nhanKy } from "@/server/services/bc/khoang-ngay";
import { LoiBaoCao } from "@/server/services/bc/loi-bao-cao";
import { danhSachDotTuyenSinh } from "@/server/services/dm/dm-05-dot-tuyen-sinh";
import { danhSachLoaiHinhBoiDuong } from "@/server/services/dm/dm-03-loai-hinh-boi-duong";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { NutIn } from "@/app/(dashboard)/khoa-hoc/[id]/chung-chi/in/nut-in";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";

type ThamSo = { tuNgay?: string; denNgay?: string; dot?: string; loaiHinh?: string; trangThai?: string };

const phanTram = (x: number | null) => (x === null ? "—" : `${x.toLocaleString("vi-VN")}%`);

// BC-02: báo cáo định kỳ hoạt động đào tạo - xem trên trang, in/lưu PDF, tải Excel theo mẫu
export default async function BaoCaoDaoTaoPage({ searchParams }: { searchParams: Promise<ThamSo> }) {
  try {
    await requirePermission("BC-02");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const thamSo = await searchParams;
  const [dsDot, dsLoaiHinh] = await Promise.all([danhSachDotTuyenSinh(), danhSachLoaiHinhBoiDuong()]);
  let duLieu;
  try {
    const { loc, moTaLoc } = await docLocBaoCaoDaoTao(thamSo);
    duLieu = { loc, moTaLoc, bc: await baoCaoHoatDongDaoTao(loc) };
  } catch (error) {
    if (!(error instanceof LoiBaoCao)) throw error;
    duLieu = { loi: error.message };
  }
  const query = new URLSearchParams(
    Object.entries(thamSo).filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== ""),
  ).toString();

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-xl font-bold text-ued-blue-dam">BC-02 · Báo cáo định kỳ hoạt động đào tạo</h1>
        <Link href="/bao-cao/tai-chinh" className="text-sm underline">
          Báo cáo tài chính học phí (BC-03) →
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3 shadow-sm print:hidden">
        <label className="flex flex-col gap-1 text-sm">
          Từ ngày
          <Input name="tuNgay" type="date" defaultValue={thamSo.tuNgay ?? ""} className="w-40" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Đến ngày
          <Input name="denNgay" type="date" defaultValue={thamSo.denNgay ?? ""} className="w-40" />
        </label>
        <select name="dot" defaultValue={thamSo.dot ?? ""} className="h-8 rounded-lg border px-2 text-sm" aria-label="Đợt">
          <option value="">Mọi đợt</option>
          {dsDot.map((d) => (
            <option key={d.id} value={d.id}>
              {d.ten}
            </option>
          ))}
        </select>
        <select
          name="loaiHinh"
          defaultValue={thamSo.loaiHinh ?? ""}
          className="h-8 rounded-lg border px-2 text-sm"
          aria-label="Loại hình"
        >
          <option value="">Mọi loại hình</option>
          {dsLoaiHinh.map((l) => (
            <option key={l.id} value={l.id}>
              {l.ten}
            </option>
          ))}
        </select>
        <select
          name="trangThai"
          defaultValue={thamSo.trangThai ?? ""}
          className="h-8 rounded-lg border px-2 text-sm"
          aria-label="Trạng thái khóa"
        >
          <option value="">Mọi trạng thái khóa</option>
          {Object.entries(NHAN_TRANG_THAI_KHOA).map(([ma, nhan]) => (
            <option key={ma} value={ma}>
              {nhan}
            </option>
          ))}
        </select>
        <button type="submit" className="h-8 rounded-lg border bg-white px-3 text-sm hover:bg-muted">
          Xem báo cáo
        </button>
        {!("loi" in duLieu) && (
          <>
            <a href={`/api/bc/dao-tao${query ? `?${query}` : ""}`} className="h-8 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
              Tải Excel
            </a>
            <NutIn />
          </>
        )}
      </form>

      {"loi" in duLieu ? (
        <p className="text-sm text-destructive">{duLieu.loi}</p>
      ) : (
        <>
          <div className="text-sm">
            <p>
              Kỳ báo cáo: <b>{nhanKy(duLieu.loc)}</b>
              {duLieu.moTaLoc.length > 0 && ` · ${duLieu.moTaLoc.join(" · ")}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Khóa thuộc kỳ = thời gian học giao với kỳ. Hoàn thành = đạt kết quả đã phê duyệt và hoàn tất nghĩa vụ tài
              chính (hoặc đã có văn bằng); tỷ lệ tính trên học viên đã nhận vào các khóa đã phê duyệt kết quả.
            </p>
          </div>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Số khóa", duLieu.bc.tong.soKhoa],
              ["Học viên đã nhận", duLieu.bc.tong.soDaNhan],
              ["Hoàn thành", duLieu.bc.tong.soHoanThanh],
              ["Tỷ lệ hoàn thành", phanTram(duLieu.bc.tong.tyLeHoanThanh)],
            ].map(([nhan, giaTri]) => (
              <div key={nhan} className="rounded-lg border bg-card p-3 shadow-sm">
                <p className="text-xs text-muted-foreground">{nhan}</p>
                <p className="text-xl font-semibold">{giaTri}</p>
              </div>
            ))}
          </section>
          <p className="text-xs text-muted-foreground">
            Theo trạng thái:{" "}
            {Object.entries(duLieu.bc.theoTrangThai)
              .filter(([, so]) => so > 0)
              .map(([tt, so]) => `${NHAN_TRANG_THAI_KHOA[tt as keyof typeof NHAN_TRANG_THAI_KHOA]} ${so}`)
              .join(" · ") || "—"}
          </p>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-ued-blue-dam">Tổng hợp theo loại hình bồi dưỡng</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại hình</TableHead>
                  <TableHead>Số khóa</TableHead>
                  <TableHead>Hồ sơ ĐK</TableHead>
                  <TableHead>Đã nhận</TableHead>
                  <TableHead>Thôi học</TableHead>
                  <TableHead>Đạt</TableHead>
                  <TableHead>Hoàn thành</TableHead>
                  <TableHead>Tỷ lệ</TableHead>
                  <TableHead>Văn bằng đã cấp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...duLieu.bc.theoLoaiHinh, { loaiHinh: "Tổng cộng", ...duLieu.bc.tong }].map((l) => (
                  <TableRow key={l.loaiHinh} className={l.loaiHinh === "Tổng cộng" ? "font-semibold" : ""}>
                    <TableCell>{l.loaiHinh}</TableCell>
                    <TableCell>{l.soKhoa}</TableCell>
                    <TableCell>{l.soDangKy}</TableCell>
                    <TableCell>{l.soDaNhan}</TableCell>
                    <TableCell>{l.soThoiHoc}</TableCell>
                    <TableCell>{l.soDat}</TableCell>
                    <TableCell>{l.soHoanThanh}</TableCell>
                    <TableCell>{phanTram(l.tyLeHoanThanh)}</TableCell>
                    <TableCell>{l.soVanBangDaCap}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-ued-blue-dam">Chi tiết theo khóa ({duLieu.bc.dong.length})</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khóa</TableHead>
                  <TableHead>Loại hình / PT</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Sĩ số tối đa</TableHead>
                  <TableHead>Đã nhận</TableHead>
                  <TableHead>Thôi học</TableHead>
                  <TableHead>Đạt</TableHead>
                  <TableHead>Hoàn thành</TableHead>
                  <TableHead>Tỷ lệ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duLieu.bc.dong.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-muted-foreground">
                      Không có khóa nào trong kỳ.
                    </TableCell>
                  </TableRow>
                )}
                {duLieu.bc.dong.map((d) => (
                  <TableRow key={d.khoaId}>
                    <TableCell>
                      <Link href={`/khoa-hoc/${d.khoaId}`} className="font-medium underline print:no-underline">
                        {d.maKhoa}
                      </Link>
                      <div className="text-xs text-muted-foreground">{d.tenChuongTrinh}</div>
                    </TableCell>
                    <TableCell>
                      {d.loaiHinh} · {d.phuongThuc}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.khaiGiang?.toLocaleDateString("vi-VN") ?? "—"} - {d.beGiang?.toLocaleDateString("vi-VN") ?? "—"}
                    </TableCell>
                    <TableCell><NhanTrangThai ma={d.trangThai}>{NHAN_TRANG_THAI_KHOA[d.trangThai] ?? d.trangThai}</NhanTrangThai></TableCell>
                    <TableCell>{d.siSoToiDa}</TableCell>
                    <TableCell>{d.soDaNhan}</TableCell>
                    <TableCell>{d.soThoiHoc}</TableCell>
                    <TableCell>{d.soDat}</TableCell>
                    <TableCell>{d.soHoanThanh ?? "Chưa có KQ"}</TableCell>
                    <TableCell>{phanTram(d.tyLeHoanThanh)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </>
      )}
    </main>
  );
}

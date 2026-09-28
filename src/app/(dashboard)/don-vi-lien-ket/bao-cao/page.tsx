import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { baoCaoDonViLienKet, docLocBaoCaoDvlk, tuyChonBaoCaoDvlk } from "@/server/services/dvlk/dvlk-07-bao-cao";
import { nhanKy } from "@/server/services/bc/khoang-ngay";
import { LoiBaoCao } from "@/server/services/bc/loi-bao-cao";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { NutIn } from "@/app/(dashboard)/khoa-hoc/[id]/chung-chi/in/nut-in";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";

type ThamSo = { tuNgay?: string; denNgay?: string; donVi?: string; khoa?: string };

const tien = (so: number | null) => (so === null ? "—" : `${so.toLocaleString("vi-VN")} đ`);

// DVLK-07: báo cáo công nợ và doanh thu theo đơn vị liên kết - khớp các hợp đồng đã/chưa thanh lý
export default async function BaoCaoDonViLienKetPage({ searchParams }: { searchParams: Promise<ThamSo> }) {
  try {
    await requirePermission("DVLK-07");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const thamSo = await searchParams;
  const { dsDonVi, dsKhoa } = await tuyChonBaoCaoDvlk();
  let duLieu;
  try {
    const { loc, moTaLoc } = await docLocBaoCaoDvlk(thamSo);
    duLieu = { loc, moTaLoc, bc: await baoCaoDonViLienKet(loc) };
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
        <h1 className="text-xl font-bold text-ued-blue-dam">DVLK-07 · Báo cáo công nợ và doanh thu theo đơn vị liên kết</h1>
        <Link href="/don-vi-lien-ket/hop-dong" className="text-sm underline">
          ← Hợp đồng liên kết (DVLK-03)
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
        <select name="donVi" defaultValue={thamSo.donVi ?? ""} className="h-8 rounded-lg border px-2 text-sm" aria-label="Đơn vị liên kết">
          <option value="">Mọi đơn vị liên kết</option>
          {dsDonVi.map((dv) => (
            <option key={dv.id} value={dv.id}>
              {dv.ma} · {dv.ten}
            </option>
          ))}
        </select>
        <select name="khoa" defaultValue={thamSo.khoa ?? ""} className="h-8 rounded-lg border px-2 text-sm" aria-label="Khóa">
          <option value="">Mọi khóa</option>
          {dsKhoa.map((k) => (
            <option key={k.id} value={k.id}>
              {k.maKhoa} · {k.chuongTrinh.ten}
            </option>
          ))}
        </select>
        <button type="submit" className="h-8 rounded-lg border bg-white px-3 text-sm hover:bg-muted">
          Xem báo cáo
        </button>
        {!("loi" in duLieu) && (
          <>
            <a
              href={`/api/dvlk/bao-cao${query ? `?${query}` : ""}`}
              className="h-8 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
            >
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
              Doanh thu = số tiền quyết toán trên biên bản của hợp đồng thanh lý trong kỳ. Công nợ = hợp đồng chưa thanh lý
              tại thời điểm lập báo cáo, tạm tính theo đơn giá thỏa thuận × số học viên hợp lệ hiện có.
            </p>
          </div>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Doanh thu trong kỳ", tien(duLieu.bc.tong.doanhThu), `${duLieu.bc.tong.soThanhLyTrongKy} hợp đồng thanh lý trong kỳ`],
              [
                "Công nợ chưa thanh lý (tạm tính)",
                tien(duLieu.bc.tong.congNoTamTinh),
                `${duLieu.bc.tong.soChuaThanhLy} hợp đồng${duLieu.bc.tong.soChuaCoDonGia ? ` · ${duLieu.bc.tong.soChuaCoDonGia} chưa có đơn giá` : ""}`,
              ],
              ["Học viên hợp lệ", duLieu.bc.tong.soHopLe, `${duLieu.bc.tong.soThucTe} thực tế / ${duLieu.bc.tong.soDuKien} dự kiến`],
              ["Đơn vị liên kết", duLieu.bc.theoDonVi.length, `${duLieu.bc.tong.soHopDong} hợp đồng`],
            ].map(([nhan, giaTri, phu]) => (
              <div key={String(nhan)} className="rounded-lg border bg-card p-3 shadow-sm">
                <p className="text-xs text-muted-foreground">{nhan}</p>
                <p className="text-xl font-semibold">{giaTri}</p>
                <p className="text-xs text-muted-foreground">{phu}</p>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-1 rounded-lg border bg-card p-3 shadow-sm text-sm">
            <h2 className="font-semibold">Đối soát với các hợp đồng đã/chưa thanh lý</h2>
            {[
              ["Doanh thu = tổng quyết toán hợp đồng thanh lý trong kỳ", duLieu.bc.doiSoat.doanhThuKhop],
              ["Số hợp đồng chưa thanh lý", duLieu.bc.doiSoat.soChuaThanhLyKhop],
              ["Trạng thái tài chính học viên khớp trạng thái hợp đồng", duLieu.bc.doiSoat.lech.length === 0],
            ].map(([nhan, khop]) => (
              <p key={String(nhan)} className={khop ? "" : "font-semibold text-destructive"}>
                {khop ? "✓" : "✗"} {nhan}: {khop ? "khớp" : "LỆCH"}
              </p>
            ))}
            {duLieu.bc.doiSoat.lech.map((x) => (
              <p key={x.maHopDong} className="text-xs text-destructive">
                {x.maHopDong} ({x.tenDonVi}): {x.lyDo.join("; ")}
              </p>
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-ued-blue-dam">Tổng hợp theo đơn vị liên kết</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Đơn vị</TableHead>
                  <TableHead>Hợp đồng (đã / chưa thanh lý)</TableHead>
                  <TableHead>HV dự kiến / thực tế / hợp lệ</TableHead>
                  <TableHead>Doanh thu trong kỳ</TableHead>
                  <TableHead>Công nợ tạm tính</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duLieu.bc.theoDonVi.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      Không có hợp đồng liên kết trong phạm vi lọc.
                    </TableCell>
                  </TableRow>
                )}
                {duLieu.bc.theoDonVi.map((d) => (
                  <TableRow key={d.donViLienKetId}>
                    <TableCell>
                      <Link href={`/don-vi-lien-ket/${d.donViLienKetId}`} className="font-medium underline print:no-underline">
                        {d.maDonVi}
                      </Link>
                      <div className="text-xs text-muted-foreground">{d.tenDonVi}</div>
                    </TableCell>
                    <TableCell>
                      {d.soHopDong} ({d.soDaThanhLy} / {d.soChuaThanhLy})
                    </TableCell>
                    <TableCell>
                      {d.soDuKien} / {d.soThucTe} / {d.soHopLe}
                    </TableCell>
                    <TableCell>{tien(d.doanhThu)}</TableCell>
                    <TableCell>
                      {tien(d.congNoTamTinh)}
                      {d.soChuaCoDonGia > 0 && (
                        <div className="text-xs text-muted-foreground">{d.soChuaCoDonGia} hợp đồng chưa có đơn giá</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {duLieu.bc.theoDonVi.length > 0 && (
                  <TableRow className="font-semibold">
                    <TableCell>Tổng cộng</TableCell>
                    <TableCell>
                      {duLieu.bc.tong.soHopDong} ({duLieu.bc.tong.soDaThanhLy} / {duLieu.bc.tong.soChuaThanhLy})
                    </TableCell>
                    <TableCell>
                      {duLieu.bc.tong.soDuKien} / {duLieu.bc.tong.soThucTe} / {duLieu.bc.tong.soHopLe}
                    </TableCell>
                    <TableCell>{tien(duLieu.bc.tong.doanhThu)}</TableCell>
                    <TableCell>{tien(duLieu.bc.tong.congNoTamTinh)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-ued-blue-dam">Chi tiết hợp đồng ({duLieu.bc.chiTiet.length})</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hợp đồng</TableHead>
                  <TableHead>Khóa</TableHead>
                  <TableHead>Đơn giá</TableHead>
                  <TableHead>HV dự kiến / thực tế / hợp lệ</TableHead>
                  <TableHead>Thanh lý</TableHead>
                  <TableHead>Doanh thu trong kỳ</TableHead>
                  <TableHead>Công nợ tạm tính</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duLieu.bc.chiTiet.map((c) => (
                  <TableRow key={c.hopDongId}>
                    <TableCell>
                      <Link href={`/don-vi-lien-ket/hop-dong/${c.hopDongId}`} className="font-medium underline print:no-underline">
                        {c.maHopDong}
                      </Link>
                      <div className="text-xs text-muted-foreground">{c.tenDonVi}</div>
                    </TableCell>
                    <TableCell>
                      {c.maKhoa}
                      <div className="text-xs text-muted-foreground">{c.tenChuongTrinh}</div>
                    </TableCell>
                    <TableCell>{tien(c.donGia)}</TableCell>
                    <TableCell>
                      {c.soDuKien ?? "—"} / {c.soThucTe} / {c.soHopLe}
                    </TableCell>
                    <TableCell>
                      {c.daThanhLy ? (
                        <>
                          {c.soBienBan} · {c.ngayThanhLy?.toLocaleDateString("vi-VN")}
                          <div className="text-xs text-muted-foreground">
                            Quyết toán {tien(c.soTienQuyetToan)} · {c.soHoanThanh ?? 0} hoàn thành · {c.soThoiHoc ?? 0} thôi học
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Chưa thanh lý</span>
                      )}
                    </TableCell>
                    <TableCell>{tien(c.doanhThu)}</TableCell>
                    <TableCell>{c.chuaCoDonGia ? "Chưa có đơn giá" : tien(c.congNoTamTinh)}</TableCell>
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

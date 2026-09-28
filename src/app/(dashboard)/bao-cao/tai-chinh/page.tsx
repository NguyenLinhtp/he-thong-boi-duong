import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { baoCaoTaiChinhHocPhi, docLocBaoCaoTaiChinh } from "@/server/services/bc/bc-03-bao-cao-tai-chinh";
import { nhanKy } from "@/server/services/bc/khoang-ngay";
import { LoiBaoCao } from "@/server/services/bc/loi-bao-cao";
import { danhSachDotTuyenSinh } from "@/server/services/dm/dm-05-dot-tuyen-sinh";
import { danhSachKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { NutIn } from "@/app/(dashboard)/khoa-hoc/[id]/chung-chi/in/nut-in";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";

type ThamSo = { tuNgay?: string; denNgay?: string; dot?: string; khoa?: string };

const tien = (so: number | null) => (so === null ? "—" : `${so.toLocaleString("vi-VN")} đ`);

// BC-03: báo cáo tài chính học phí phục vụ đối soát - số liệu lấy từ module học phí (HP-05)
export default async function BaoCaoTaiChinhPage({ searchParams }: { searchParams: Promise<ThamSo> }) {
  try {
    await requirePermission("BC-03");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const thamSo = await searchParams;
  const [dsDot, dsKhoa] = await Promise.all([danhSachDotTuyenSinh(), danhSachKhoa()]);
  let duLieu;
  try {
    const { loc, moTaLoc } = await docLocBaoCaoTaiChinh(thamSo);
    duLieu = { loc, moTaLoc, bc: await baoCaoTaiChinhHocPhi(loc) };
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
        <h1 className="text-xl font-bold text-ued-blue-dam">BC-03 · Báo cáo tài chính học phí</h1>
        <Link href="/bao-cao/dao-tao" className="text-sm underline">
          ← Báo cáo hoạt động đào tạo (BC-02)
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
              href={`/api/bc/tai-chinh${query ? `?${query}` : ""}`}
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
              Doanh thu = tổng phiếu thu lập trong kỳ (khớp HP-05). Công nợ tính tại thời điểm lập báo cáo. Học viên qua đơn
              vị liên kết thu qua quyết toán hợp đồng, không tính vào doanh thu cá nhân.
            </p>
          </div>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Doanh thu trong kỳ", tien(duLieu.bc.doanhThu.tong), `${duLieu.bc.doanhThu.soPhieuThu} phiếu thu`],
              ["Công nợ hiện tại", tien(duLieu.bc.congNo.tong), `${duLieu.bc.congNo.soHocVien} học viên`],
              ["Phải thu lũy kế", tien(duLieu.bc.tongTheoKhoa.phaiThu), `${duLieu.bc.tongTheoKhoa.soHocVien} học viên`],
              ["Đã thu lũy kế", tien(duLieu.bc.tongTheoKhoa.daThuLuyKe), `${duLieu.bc.tongTheoKhoa.soMienGiam} miễn giảm`],
            ].map(([nhan, giaTri, phu]) => (
              <div key={nhan} className="rounded-lg border bg-card p-3 shadow-sm">
                <p className="text-xs text-muted-foreground">{nhan}</p>
                <p className="text-xl font-semibold">{giaTri}</p>
                <p className="text-xs text-muted-foreground">{phu}</p>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-1 rounded-lg border bg-card p-3 shadow-sm text-sm">
            <h2 className="font-semibold">Đối soát với module Quản lý học phí</h2>
            {[
              ["Doanh thu = tổng phiếu thu trong kỳ", duLieu.bc.doiSoat.doanhThuKhopPhieuThu],
              ["Công nợ = tổng công nợ theo khóa", duLieu.bc.doiSoat.congNoKhopTheoKhoa],
              ["Số đã nộp từng khoản = tổng phiếu thu của khoản đó", duLieu.bc.doiSoat.lechHocPhi.length === 0],
            ].map(([nhan, khop]) => (
              <p key={String(nhan)} className={khop ? "" : "font-semibold text-destructive"}>
                {khop ? "✓" : "✗"} {nhan}: {khop ? "khớp" : "LỆCH"}
              </p>
            ))}
            {duLieu.bc.doiSoat.lechHocPhi.map((x) => (
              <p key={`${x.maHocVien}-${x.maKhoa}`} className="text-xs text-destructive">
                {x.maHocVien} {x.hoTen} (khóa {x.maKhoa}): ghi nhận {tien(x.daNopGhiNhan)}, phiếu thu {tien(x.tongPhieuThu)}
              </p>
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-ued-blue-dam">Tình hình học phí theo khóa</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khóa</TableHead>
                  <TableHead>Mức học phí</TableHead>
                  <TableHead>Số HV</TableHead>
                  <TableHead>Phải thu</TableHead>
                  <TableHead>Đã thu lũy kế</TableHead>
                  <TableHead>Thu trong kỳ</TableHead>
                  <TableHead>Còn nợ</TableHead>
                  <TableHead>Nộp đủ / nợ / miễn giảm / ĐVLK</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duLieu.bc.theoKhoa.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      Chưa có dữ liệu học phí trong phạm vi lọc.
                    </TableCell>
                  </TableRow>
                )}
                {duLieu.bc.theoKhoa.map((k) => (
                  <TableRow key={k.khoaId}>
                    <TableCell>
                      <Link href={`/khoa-hoc/${k.khoaId}/hoc-phi`} className="font-medium underline print:no-underline">
                        {k.maKhoa}
                      </Link>
                      <div className="text-xs text-muted-foreground">{k.tenChuongTrinh}</div>
                    </TableCell>
                    <TableCell>{tien(k.mucHocPhi)}</TableCell>
                    <TableCell>{k.soHocVien}</TableCell>
                    <TableCell>{tien(k.phaiThu)}</TableCell>
                    <TableCell>{tien(k.daThuLuyKe)}</TableCell>
                    <TableCell>{tien(k.thuTrongKy)}</TableCell>
                    <TableCell>{tien(k.conNo)}</TableCell>
                    <TableCell>
                      {k.soDaNopDu} / {k.soConNo} / {k.soMienGiam} / {k.soQuaDvlk}
                    </TableCell>
                  </TableRow>
                ))}
                {duLieu.bc.theoKhoa.length > 0 && (
                  <TableRow className="font-semibold">
                    <TableCell>Tổng cộng</TableCell>
                    <TableCell />
                    <TableCell>{duLieu.bc.tongTheoKhoa.soHocVien}</TableCell>
                    <TableCell>{tien(duLieu.bc.tongTheoKhoa.phaiThu)}</TableCell>
                    <TableCell>{tien(duLieu.bc.tongTheoKhoa.daThuLuyKe)}</TableCell>
                    <TableCell>{tien(duLieu.bc.tongTheoKhoa.thuTrongKy)}</TableCell>
                    <TableCell>{tien(duLieu.bc.tongTheoKhoa.conNo)}</TableCell>
                    <TableCell>
                      {duLieu.bc.tongTheoKhoa.soDaNopDu} / {duLieu.bc.tongTheoKhoa.soConNo} /{" "}
                      {duLieu.bc.tongTheoKhoa.soMienGiam} / {duLieu.bc.tongTheoKhoa.soQuaDvlk}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-ued-blue-dam">
              Doanh thu theo hình thức nộp ·{" "}
              {duLieu.bc.doanhThu.theoHinhThuc.map((h) => `${h.hinhThuc}: ${tien(h.soTien)} (${h.soPhieu} phiếu)`).join(" · ") ||
                "—"}
            </h2>
            <h2 className="text-sm font-bold text-ued-blue-dam">Bảng kê phiếu thu trong kỳ ({duLieu.bc.phieuThu.length})</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số phiếu</TableHead>
                  <TableHead>Ngày lập</TableHead>
                  <TableHead>Học viên</TableHead>
                  <TableHead>Khóa</TableHead>
                  <TableHead>Hình thức</TableHead>
                  <TableHead>Số tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duLieu.bc.phieuThu.map((pt) => (
                  <TableRow key={pt.soPhieu}>
                    <TableCell>{pt.soPhieu}</TableCell>
                    <TableCell>{pt.ngayLap.toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell>
                      {pt.hoTen} <span className="text-xs text-muted-foreground">{pt.maHocVien}</span>
                    </TableCell>
                    <TableCell>{pt.maKhoa}</TableCell>
                    <TableCell>{pt.hinhThucNop ?? "—"}</TableCell>
                    <TableCell>{tien(pt.soTien)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-ued-blue-dam">Học viên còn nợ ({duLieu.bc.congNo.chiTiet.length})</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Học viên</TableHead>
                  <TableHead>Khóa</TableHead>
                  <TableHead>Phải nộp</TableHead>
                  <TableHead>Đã nộp</TableHead>
                  <TableHead>Còn nợ</TableHead>
                  <TableHead>Hạn nộp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duLieu.bc.congNo.chiTiet.map((c) => (
                  <TableRow key={`${c.maHocVien}-${c.maKhoa}`}>
                    <TableCell>
                      {c.hoTen} <span className="text-xs text-muted-foreground">{c.maHocVien}</span>
                    </TableCell>
                    <TableCell>{c.maKhoa}</TableCell>
                    <TableCell>{tien(c.phaiNop)}</TableCell>
                    <TableCell>{tien(c.daNop)}</TableCell>
                    <TableCell>{tien(c.conNo)}</TableCell>
                    <TableCell>{c.hanNop?.toLocaleDateString("vi-VN") ?? "—"}</TableCell>
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

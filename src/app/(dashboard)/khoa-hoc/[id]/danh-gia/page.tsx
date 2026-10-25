import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import {
  bangDanhGiaKhoa,
  thongKeChamTheoGiangVien,
  thongKeTheoBai,
  type DongHocVien,
  type MucBai,
  type OBai,
} from "@/server/services/gd/gd-04-quan-ly-danh-gia";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { DauTrangKhoa } from "@/components/khoa/dau-trang-khoa";
import { KhongKhop, OTimKiem, PhanTrang, locVaPhanTrang, thamSoPhang, type ThamSoUrl } from "@/components/chung/phan-trang";
import { KhungChonNhieu, OChon, OChonTatCa, type HanhDongLo } from "@/components/chung/chon-nhieu";
import { dinhDangNgay } from "@/lib/dinh-dang";
import { cn } from "@/lib/utils";
import { giaHanLoAction, thuHoiGiaHanLoAction } from "./actions";

const CHUA_XEP = "chua-xep";
const LOC = [
  { gt: "", nhan: "Tất cả học viên" },
  { gt: "chua-dat", nhan: "Còn nội dung chưa đạt" },
  { gt: "chua-lam", nhan: "Còn bài chưa làm/chưa nộp" },
  { gt: "chua-cham", nhan: "Còn sản phẩm chưa chấm" },
  { gt: "gia-han", nhan: "Đang được gia hạn" },
];

const tenMuc = (m: MucBai) => `${m.loai === "TN" ? "Trắc nghiệm" : "Sản phẩm"}: ${m.ten}`;
const so = (n: number | null) => (n === null ? "—" : n.toLocaleString("vi-VN"));

/** 1 ô kết quả của học viên ở 1 bài. */
function OKetQua({ m, o }: { m: MucBai; o: OBai }) {
  const mau =
    o.trangThai === "DAT" ? "text-success" : o.trangThai === "CHUA_DAT" ? "text-destructive" : o.trangThai === "CHUA_CHAM" || o.trangThai === "DANG_LAM" ? "text-warning" : "";
  const chu =
    o.trangThai === "CHUA_LAM"
      ? m.loai === "TN" ? "Chưa làm" : "Chưa nộp"
      : o.trangThai === "DANG_LAM"
        ? "Đang làm"
        : o.trangThai === "CHUA_CHAM"
          ? "Chưa chấm"
          : `${so(o.diem)}/${m.thangDiem}`;
  return (
    <span className="flex flex-col leading-tight">
      <span className={cn("font-medium", mau, o.trangThai === "CHUA_LAM" && "text-muted-foreground")}>{chu}</span>
      {m.loai === "TN" && (
        <span className="text-xs text-muted-foreground">
          {o.soLan}
          {o.soLanToiDa ? `/${o.soLanToiDa}` : ""} lượt
        </span>
      )}
      {m.loai === "SP" && o.trangThai === "CHUA_CHAM" && o.giangVien && <span className="text-xs text-muted-foreground">GV: {o.giangVien}</span>}
      {o.giaHan && (
        <span className={cn("text-xs", o.giaHan.conHieuLuc || !o.giaHan.hanDen ? "text-primary" : "text-muted-foreground line-through")}>
          Gia hạn
          {o.giaHan.soLanThem ? ` +${o.giaHan.soLanThem} lượt` : ""}
          {o.giaHan.moNopLai ? " · mở nộp lại" : ""}
          {o.giaHan.hanDen ? ` · đến ${dinhDangNgay(o.giaHan.hanDen)}` : ""}
        </span>
      )}
    </span>
  );
}

// (bổ sung 25/10/2026 - GD-04/KQ-01) quản lý kết quả làm bài trắc nghiệm, nộp/chấm sản phẩm cuối khóa
export default async function BaiLamTrucTuyenPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ThamSoUrl> }) {
  try {
    await requirePermission("KQ-02");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }
  const { id } = await params;
  const khoa = await layKhoa(id);
  if (!khoa) notFound();
  if (khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI")) notFound();

  const bang = await bangDanhGiaKhoa(id);
  const sp = await searchParams;
  const thamSo = thamSoPhang(sp);
  const duong = `/khoa-hoc/${id}/danh-gia`;
  const coLop = bang.dsLop.length > 0;

  // bộ lọc: lớp, bài, tình trạng
  const lopChon = coLop ? (thamSo.lop ?? "") : "";
  const dsTheoLop = (lop: string) => (lop === "" ? bang.dsDong : lop === CHUA_XEP ? bang.dsDong.filter((d) => !d.lopId) : bang.dsDong.filter((d) => d.lopId === lop));
  const dsNhom = dsTheoLop(lopChon);
  const mucChon = bang.dsMuc.find((m) => m.key === thamSo.bai) ?? null;
  const dsMucHien = mucChon ? [mucChon] : bang.dsMuc;
  const loc = LOC.find((l) => l.gt === thamSo.loc)?.gt ?? "";
  const hopLoc = (d: DongHocVien) => {
    const ds = dsMucHien.map((m) => d.o[m.key]);
    if (loc === "chua-dat") return mucChon ? mucChon.diemDat !== null && d.o[mucChon.key].trangThai !== "DAT" : d.chuaDat.length > 0;
    if (loc === "chua-lam") return ds.some((o) => o.trangThai === "CHUA_LAM" || o.trangThai === "DANG_LAM");
    if (loc === "chua-cham") return ds.some((o) => o.trangThai === "CHUA_CHAM");
    if (loc === "gia-han") return ds.some((o) => o.giaHan);
    return true;
  };
  const trang = locVaPhanTrang(dsNhom.filter(hopLoc), sp, "hv", (d) => ({ hoTen: d.hoTen, soCCCD: d.soCCCD, maHocVien: d.maHocVien }), (d) => [d.lop]);

  const thongKe = thongKeTheoBai(bang.dsMuc, dsNhom);
  const thongKeCham = thongKeChamTheoGiangVien(bang.dsMuc, dsNhom);
  const soChuaDat = dsNhom.filter((d) => d.chuaDat.length > 0).length;
  const coDiemDat = bang.dsMuc.some((m) => m.diemDat !== null);
  const nhomLop = coLop && lopChon === ""
    ? [...bang.dsLop.map((l) => ({ ma: l.id, ten: l.ten })), ...(bang.dsDong.some((d) => !d.lopId) ? [{ ma: CHUA_XEP, ten: "Chưa xếp lớp" }] : [])]
    : [];

  const chonBai = { ten: "mucKey", nhan: "Bài", loai: "select" as const, batBuoc: true, ds: bang.dsMuc.map((m) => ({ gt: m.key, nhan: `${tenMuc(m)} (${m.hocPhan})` })) };
  const hanhDong: HanhDongLo[] =
    bang.daPheDuyet || bang.dsMuc.length === 0
      ? []
      : [
          {
            ma: "gia-han",
            nhan: "Gia hạn / mở làm lại",
            truong: [
              mucChon ? { ...chonBai, ds: [chonBai.ds.find((x) => x.gt === mucChon.key)!, ...chonBai.ds.filter((x) => x.gt !== mucChon.key)] } : chonBai,
              { ten: "soLanThem", nhan: "Trắc nghiệm: số lượt làm thêm", loai: "text", goiY: "vd. 1" },
              { ten: "moNopLai", nhan: "Sản phẩm: mở nộp lại", loai: "select", ds: [{ gt: "KHONG", nhan: "Không" }, { gt: "CO", nhan: "Có (kể cả bài đã chấm)" }] },
              { ten: "hanDen", nhan: bang.quaBeGiang ? "Làm/nộp đến hết ngày (bắt buộc - đã qua bế giảng)" : "Làm/nộp đến hết ngày (nếu sau bế giảng)", loai: "date" },
              { ten: "lyDo", nhan: "Lý do", loai: "text", batBuoc: true },
            ],
            xacNhan: "Gia hạn bài đã chọn cho các học viên? Chỉ học viên được mở mới làm/nộp lại được.",
            thucHien: giaHanLoAction.bind(null, id),
          },
          {
            ma: "thu-hoi",
            nhan: "Thu hồi gia hạn",
            nguyHiem: true,
            truong: [chonBai],
            xacNhan: "Thu hồi gia hạn ở bài đã chọn? Học viên trở lại theo số lần làm và ngày bế giảng chung.",
            thucHien: thuHoiGiaHanLoAction.bind(null, id),
          },
        ];

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <DauTrangKhoa khoa={khoa} dangChon="danh-gia" />

      <p className="text-sm text-muted-foreground">
        Bài trắc nghiệm và sản phẩm cuối khóa theo học liệu của chương trình. Hạn làm bài/nộp sản phẩm chung: hết ngày bế giảng
        {khoa.thoiGianBeGiang ? ` (${dinhDangNgay(khoa.thoiGianBeGiang)})` : " (khóa chưa đặt ngày bế giảng)"}
        {bang.quaBeGiang && <b className="text-destructive"> - đã qua bế giảng, chỉ học viên được gia hạn mới làm/nộp được</b>}.
        {bang.daPheDuyet && <b> Kết quả khóa đã phê duyệt - không gia hạn được nữa.</b>}
      </p>

      {bang.dsMuc.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          Chương trình chưa có bài trắc nghiệm hoặc yêu cầu sản phẩm nào (tab Học liệu & đánh giá của chương trình).
        </p>
      ) : (
        <>
          <form action={duong} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3 text-sm shadow-sm">
            {coLop && (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium">Lớp</span>
                <select name="lop" defaultValue={lopChon} className="h-8 rounded-lg border px-2">
                  <option value="">Cả khóa</option>
                  {bang.dsLop.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.ten}
                    </option>
                  ))}
                  <option value={CHUA_XEP}>Chưa xếp lớp</option>
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium">Bài</span>
              <select name="bai" defaultValue={mucChon?.key ?? ""} className="h-8 max-w-96 rounded-lg border px-2">
                <option value="">Tất cả bài</option>
                {bang.dsMuc.map((m) => (
                  <option key={m.key} value={m.key}>
                    {tenMuc(m)} ({m.hocPhan})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium">Tình trạng</span>
              <select name="loc" defaultValue={loc} className="h-8 rounded-lg border px-2">
                {LOC.map((l) => (
                  <option key={l.gt} value={l.gt}>
                    {l.nhan}
                  </option>
                ))}
              </select>
            </label>
            {thamSo.hv_q && <input type="hidden" name="hv_q" value={thamSo.hv_q} />}
            <button type="submit" className="h-8 rounded-lg bg-primary px-3 font-medium text-primary-foreground">
              Xem
            </button>
          </form>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-bold text-ued-blue-dam">
              Tình hình theo bài - {lopChon === "" ? "cả khóa" : lopChon === CHUA_XEP ? "chưa xếp lớp" : bang.dsLop.find((l) => l.id === lopChon)?.ten} ({dsNhom.length} học viên)
              {coDiemDat && <span className="font-normal text-muted-foreground"> · {soChuaDat} học viên còn nội dung chưa đạt</span>}
            </h2>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bài</TableHead>
                    <TableHead className="text-right">Đã làm/nộp</TableHead>
                    <TableHead className="text-right">Chưa làm/nộp</TableHead>
                    <TableHead className="text-right">Đang làm</TableHead>
                    <TableHead className="text-right">Đã chấm</TableHead>
                    <TableHead className="text-right">Chưa chấm</TableHead>
                    <TableHead className="text-right">Đạt</TableHead>
                    <TableHead className="text-right">Chưa đạt</TableHead>
                    <TableHead className="text-right">Điểm TB</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {thongKe.map((t) => (
                    <TableRow key={t.muc.key}>
                      <TableCell>
                        <span className="font-medium">{tenMuc(t.muc)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {t.muc.hocPhan} · thang {t.muc.thangDiem}
                          {t.muc.diemDat !== null ? ` · điểm đạt ${so(t.muc.diemDat)}` : " · không xét đạt"}
                          {t.muc.soLanToiDa ? ` · tối đa ${t.muc.soLanToiDa} lượt` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{t.daLam}/{t.tong}</TableCell>
                      <TableCell className="text-right">{t.chuaLam}</TableCell>
                      <TableCell className="text-right">{t.muc.loai === "TN" ? t.dangLam : "—"}</TableCell>
                      <TableCell className="text-right">{t.muc.loai === "SP" ? t.daCham : "—"}</TableCell>
                      <TableCell className={cn("text-right", t.chuaCham > 0 && "font-medium text-warning")}>{t.muc.loai === "SP" ? t.chuaCham : "—"}</TableCell>
                      <TableCell className="text-right">{t.muc.diemDat !== null ? t.dat : "—"}</TableCell>
                      <TableCell className={cn("text-right", t.chuaDat > 0 && "font-medium text-destructive")}>{t.muc.diemDat !== null ? t.chuaDat : "—"}</TableCell>
                      <TableCell className="text-right">{t.diemTB === null ? "—" : `${so(t.diemTB)}/${t.muc.thangDiem}`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          {nhomLop.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-bold text-ued-blue-dam">Theo lớp</h2>
              <div className="overflow-x-auto rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lớp</TableHead>
                      <TableHead className="text-right">Học viên</TableHead>
                      {bang.dsMuc.map((m) => (
                        <TableHead key={m.key} className="text-right" title={tenMuc(m)}>
                          {m.loai === "TN" ? "TN" : "SP"}: {m.ten}
                        </TableHead>
                      ))}
                      {coDiemDat && <TableHead className="text-right">Còn chưa đạt</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nhomLop.map((l) => {
                      const ds = dsTheoLop(l.ma);
                      const tk = thongKeTheoBai(bang.dsMuc, ds);
                      return (
                        <TableRow key={l.ma}>
                          <TableCell className="font-medium">{l.ten}</TableCell>
                          <TableCell className="text-right">{ds.length}</TableCell>
                          {tk.map((t) => (
                            <TableCell key={t.muc.key} className="text-right">
                              {t.daLam}/{t.tong}
                              {t.muc.loai === "SP" && t.chuaCham > 0 && <span className="block text-xs text-warning">{t.chuaCham} chưa chấm</span>}
                              {t.muc.diemDat !== null && <span className="block text-xs text-muted-foreground">đạt {t.dat}</span>}
                            </TableCell>
                          ))}
                          {coDiemDat && <TableCell className="text-right">{ds.filter((d) => d.chuaDat.length > 0).length}</TableCell>}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}

          {bang.dsMuc.some((m) => m.loai === "SP") && (
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-bold text-ued-blue-dam">Tình hình chấm sản phẩm của giảng viên</h2>
              {thongKeCham.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có sản phẩm nào được nộp.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Giảng viên phụ trách chấm</TableHead>
                        <TableHead className="text-right">Bài đã nộp</TableHead>
                        <TableHead className="text-right">Đã chấm</TableHead>
                        <TableHead className="text-right">Chưa chấm</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {thongKeCham.map((g) => (
                        <TableRow key={g.giangVien}>
                          <TableCell className="font-medium">{g.giangVien}</TableCell>
                          <TableCell className="text-right">{g.daNop}</TableCell>
                          <TableCell className="text-right">{g.daCham}</TableCell>
                          <TableCell className={cn("text-right", g.chuaCham > 0 && "font-medium text-warning")}>{g.chuaCham}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          )}

          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-ued-blue-dam">Học viên ({trang.tongDong})</h2>
              <OTimKiem duong={duong} thamSo={thamSo} ma="hv" tuKhoa={trang.tuKhoa} ketQua={trang.tongDong} goiY="Họ tên / mã học viên / số CCCD" />
            </div>
            {trang.tuKhoa && trang.tongDong === 0 && <KhongKhop tuKhoa={trang.tuKhoa} />}
            <KhungChonNhieu dsIdTrang={trang.dsTrang.map((d) => d.hocVienId)} dsIdTatCa={trang.dsLoc.map((d) => d.hocVienId)} hanhDong={hanhDong} donVi="học viên">
              <div className="overflow-x-auto rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {hanhDong.length > 0 && (
                        <TableHead className="w-8">
                          <OChonTatCa />
                        </TableHead>
                      )}
                      <TableHead>Mã học viên</TableHead>
                      <TableHead>Họ tên</TableHead>
                      {coLop && <TableHead>Lớp</TableHead>}
                      {dsMucHien.map((m) => (
                        <TableHead key={m.key} title={`${tenMuc(m)} (${m.hocPhan})`}>
                          {m.loai === "TN" ? "TN" : "SP"}: {m.ten}
                        </TableHead>
                      ))}
                      {coDiemDat && <TableHead>Nội dung chưa đạt</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trang.dsTrang.map((d) => (
                      <TableRow key={d.hocVienId}>
                        {hanhDong.length > 0 && (
                          <TableCell className="w-8">
                            <OChon id={d.hocVienId} nhan={d.hoTen} />
                          </TableCell>
                        )}
                        <TableCell className="font-mono text-xs">{d.maHocVien}</TableCell>
                        <TableCell className="font-medium">{d.hoTen}</TableCell>
                        {coLop && <TableCell>{d.lop ?? "—"}</TableCell>}
                        {dsMucHien.map((m) => (
                          <TableCell key={m.key}>
                            <OKetQua m={m} o={d.o[m.key]} />
                          </TableCell>
                        ))}
                        {coDiemDat && (
                          <TableCell className="max-w-72 text-xs">
                            {d.chuaDat.length === 0 ? <span className="text-success">Đạt tất cả</span> : <span className="text-destructive">{d.chuaDat.join("; ")}</span>}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </KhungChonNhieu>
            <PhanTrang duong={duong} thamSo={thamSo} ten="hv_trang" trang={trang.trang} tongTrang={trang.tongTrang} tongDong={trang.tongDong} soDong={trang.soDong} />
          </section>
        </>
      )}
    </main>
  );
}

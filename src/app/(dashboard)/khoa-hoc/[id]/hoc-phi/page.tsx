import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { apDungLePhiTuDo, hocPhiCuaKhoa } from "@/server/services/hp/hp-01-thiet-lap";
import { danhSachPhieuThu } from "@/server/services/hp/hp-04-phieu-thu";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { DauTrangKhoa } from "@/components/khoa/dau-trang-khoa";
import { FormThietLap } from "./form-thiet-lap";
import { FormDoiSoat, KhoiChotDanhSach } from "./khoi-le-phi-thi";
import { bangDoiSoatLePhi, locVaSapXepDoiSoat } from "@/server/services/hp/hp-02-doi-soat-excel";
import { duocChotDanhSach } from "@/server/services/hv/hv-07-chot-danh-sach-du-thi";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";
import { dinhDangNgay } from "@/lib/dinh-dang";

const NHAN_LE_PHI: Record<string, string> = {
  CHUA_NOP: "Chưa đóng",
  CON_NO: "Nộp thiếu",
  DA_NOP_DU: "Đã đóng",
  MIEN_GIAM: "Miễn giảm",
};
const NHAN_HO_SO: Record<string, string> = {
  CHO_DUYET: "Đã đăng ký",
  HOP_LE: "Hợp lệ",
  CHINH_THUC: "Chính thức",
  HOAN_THANH: "Hoàn thành",
};
import { HangHocPhi } from "./hang-hoc-phi";
import { KhongKhop, OTimKiem, PhanTrang, locVaPhanTrang, thamSoPhang, type ThamSoUrl } from "@/components/chung/phan-trang";
import { NutTrangThaiLePhi } from "./nut-trang-thai-le-phi";
import { CauHinhThanhPhanLePhi } from "./cau-hinh-thanh-phan";
import { dsThanhPhanLePhi } from "@/server/services/hp/hp-01-thanh-phan-le-phi";
import { dinhDangTien } from "@/lib/dinh-dang";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { KhungChonNhieu, OChon, OChonTatCa, type HanhDongLo } from "@/components/chung/chon-nhieu";
import { boQuaDieuKienLoAction, chuyenLePhiLoAction, datHanNopLoAction, mienGiamLoAction, nhacNoLoAction } from "./actions-lo";

async function coQuyen(maCN: string): Promise<boolean> {
  try {
    await requirePermission(maCN);
    return true;
  } catch (error) {
    if (error instanceof KhongCoQuyenError) return false;
    throw error;
  }
}

export default async function HocPhiKhoaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ThamSoUrl>;
}) {
  try {
    await requirePermission("HP-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const { id } = await params;
  const khoa = await layKhoa(id);
  if (!khoa) notFound();

  const laDuThi = khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI");
  const theoDoiTuong = await apDungLePhiTuDo(khoa.id);
  const [dsHocPhi, dsPhieuThu, choPhepThanhToan, choPhepCongNo, choPhepXetDuyet, bangLePhi, choPhepInPhieu] = await Promise.all([
    hocPhiCuaKhoa(id),
    danhSachPhieuThu(id),
    coQuyen("HP-02"),
    coQuyen("HP-03"),
    coQuyen("HV-07"),
    laDuThi ? bangDoiSoatLePhi(id) : Promise.resolve([]),
    coQuyen("HP-04"),
  ]);
  // (bổ sung 06/10/2026) thành phần lệ phí của khóa dự thi (vd. ôn thi, thi)
  const dsThanhPhan = laDuThi ? await dsThanhPhanLePhi(id) : [];
  const duocChot = laDuThi && duocChotDanhSach(khoa);
  const dsChinhThuc = bangLePhi.filter((d) => ["CHINH_THUC", "HOAN_THANH"].includes(d.dangKy.trangThai));
  const soChinhThuc = dsChinhThuc.length;
  // (bổ sung 06/10/2026 - HP-02/03/04) mỗi danh sách có ô tìm nhanh (họ tên/mã SV/CCCD)
  // và phân trang 20 dòng riêng; bảng lệ phí: chưa xác nhận lệ phí lên trên
  const sp = await searchParams;
  const duong = `/khoa-hoc/${id}/hoc-phi`;
  const thamSo = thamSoPhang(sp);
  const lop = (d: { hocVien: { lopSinhHoat: string | null } }) => [d.hocVien.lopSinhHoat];
  const trangLePhi = locVaPhanTrang(locVaSapXepDoiSoat(bangLePhi), sp, "lp", (d) => d.hocVien, lop);
  const trangChinhThuc = locVaPhanTrang(dsChinhThuc, sp, "ct", (d) => d.hocVien, lop);
  const trangCongNo = locVaPhanTrang(dsHocPhi, sp, "cn", (hp) => hp.hocVien);
  const trangPhieuThu = locVaPhanTrang(dsPhieuThu, sp, "pt", (pt) => pt.hocPhi.hocVien, (pt) => [pt.soPhieu]);
  const thanhPhanTrang = (t: { ma: string; trang: number; tongTrang: number; tongDong: number; soDong: number }) => (
    <PhanTrang duong={duong} thamSo={thamSo} ten={`${t.ma}_trang`} trang={t.trang} tongTrang={t.tongTrang} tongDong={t.tongDong} soDong={t.soDong} />
  );
  const oTim = (t: { ma: string; tuKhoa: string; tongDong: number }, goiY?: string) => (
    <OTimKiem duong={duong} thamSo={thamSo} ma={t.ma} tuKhoa={t.tuKhoa} ketQua={t.tongDong} goiY={goiY} />
  );
  // HP-06 (Đưa vào theo HP-01): trang này đã yêu cầu HP-01 ở trên nên luôn
  // được phép - xem ghi chú trong actions.ts.
  const choPhepBoQua = true;
  // (bổ sung 06/10/2026) mỗi danh sách 1 tab con (?muc=...) cho dễ quản lý
  const dsTab = [
    { ma: "doi-soat", nhan: "Lệ phí thi · đối soát", so: bangLePhi.length, hien: laDuThi },
    { ma: "chinh-thuc", nhan: "Danh sách chính thức", so: soChinhThuc, hien: laDuThi },
    { ma: "cong-no", nhan: laDuThi ? "Công nợ lệ phí" : "Công nợ học phí", so: dsHocPhi.length, hien: true },
    { ma: "phieu-thu", nhan: "Phiếu thu", so: dsPhieuThu.length, hien: true },
    { ma: "muc-phi", nhan: laDuThi ? "Mức lệ phí" : "Mức học phí", so: undefined, hien: true },
  ].filter((t) => t.hien);
  const muc = dsTab.find((t) => t.ma === thamSo.muc)?.ma ?? dsTab[0].ma;

  // (bổ sung 07/10/2026) chọn nhiều thí sinh/khoản + thao tác hàng loạt
  const chonPhan = dsThanhPhan.length > 0
    ? [{ ten: "thanhPhanId", nhan: "Phần lệ phí", loai: "select" as const, ds: [{ gt: "", nhan: "Tất cả phần thí sinh đã đăng ký" }, ...dsThanhPhan.map((t) => ({ gt: t.id, nhan: t.ten }))] }]
    : [];
  const hdDoiSoat: HanhDongLo[] = choPhepThanhToan
    ? [
        {
          ma: "da-dong",
          nhan: "Xác nhận Đã đóng",
          truong: chonPhan.length > 0 ? chonPhan : undefined,
          xacNhan: "Ghi nhận Đã đóng (lập phiếu thu cho số còn thiếu) cho các thí sinh đã chọn?",
          thucHien: chuyenLePhiLoAction.bind(null, khoa.id, "DA_DONG"),
        },
        {
          ma: "chua-dong",
          nhan: "Chuyển Chưa đóng",
          nguyHiem: true,
          truong: [...chonPhan, { ten: "lyDo", nhan: "Lý do hủy ghi nhận", loai: "text", batBuoc: true }],
          xacNhan: "Hủy ghi nhận đã đóng? Phiếu thu đã lập chuyển Đã hủy; thí sinh Chính thức có thể trả về Hợp lệ.",
          thucHien: chuyenLePhiLoAction.bind(null, khoa.id, "CHUA_DONG"),
        },
      ]
    : [];
  const hdCongNo: HanhDongLo[] = [
    ...(choPhepThanhToan
      ? [
          {
            ma: "mien-giam",
            nhan: "Miễn giảm",
            truong: [{ ten: "lyDo", nhan: "Lý do", loai: "text" as const, goiY: "Mặc định: miễn giảm theo chính sách khóa" }],
            xacNhan: "Xác nhận miễn giảm cho các khoản đã chọn?",
            thucHien: mienGiamLoAction.bind(null, khoa.id),
          },
        ]
      : []),
    ...(choPhepCongNo
      ? [
          {
            ma: "han-nop",
            nhan: "Đặt hạn nộp",
            truong: [{ ten: "hanNop", nhan: "Hạn nộp", loai: "date" as const, batBuoc: true }],
            thucHien: datHanNopLoAction.bind(null, khoa.id),
          },
          { ma: "nhac-no", nhan: "Gửi nhắc nợ", xacNhan: "Gửi thông báo nhắc nộp cho các học viên đã chọn?", thucHien: nhacNoLoAction.bind(null, khoa.id) },
        ]
      : []),
    ...(choPhepBoQua
      ? [
          {
            ma: "bo-qua",
            nhan: "Bỏ qua điều kiện",
            nguyHiem: true,
            truong: [{ ten: "lyDo", nhan: "Lý do (lãnh đạo phê duyệt)", loai: "text" as const, batBuoc: true }],
            xacNhan: "Bỏ qua điều kiện học phí cho các học viên đã chọn?",
            thucHien: boQuaDieuKienLoAction.bind(null, khoa.id),
          },
        ]
      : []),
  ];
  const hdPhieuThu: HanhDongLo[] = choPhepInPhieu ? [{ ma: "in", nhan: "In các phiếu đã chọn", lienKet: "/hoc-phi/phieu-thu/in?ids=" }] : [];
  const idHocPhi = (ds: typeof bangLePhi) => ds.flatMap((d) => (d.hocPhi ? [d.hocPhi.id] : []));

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <DauTrangKhoa khoa={khoa} dangChon="hoc-phi" />

      <nav aria-label="Danh sách học phí" className="-mt-2 flex flex-wrap gap-1.5 print:hidden">
        {dsTab.map((t) => (
          <Link
            key={t.ma}
            href={`${duong}?muc=${t.ma}`}
            scroll={false}
            aria-current={t.ma === muc ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors",
              t.ma === muc ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.nhan}
            {t.so !== undefined && <span className={cn("ml-1.5 text-xs", t.ma === muc ? "opacity-80" : "opacity-70")}>{t.so}</span>}
          </Link>
        ))}
      </nav>

      {muc === "doi-soat" && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-sm font-bold text-ued-blue-dam">
              Lệ phí thi · đối soát chuyển khoản ({bangLePhi.length} thí sinh đăng ký
              {khoa.hanDangKy && `, hạn đăng ký ${dinhDangNgay(khoa.hanDangKy)}`})
            </h2>
            {bangLePhi.length > 0 && oTim(trangLePhi, "Mã sinh viên / số CCCD / họ tên")}
          </div>
          {trangLePhi.tuKhoa && trangLePhi.tongDong === 0 && <KhongKhop tuKhoa={trangLePhi.tuKhoa} />}
          {trangLePhi.tongDong > 0 && (
            <KhungChonNhieu dsIdTrang={idHocPhi(trangLePhi.dsTrang)} dsIdTatCa={idHocPhi(trangLePhi.dsLoc)} hanhDong={hdDoiSoat}>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {hdDoiSoat.length > 0 && <TableHead className="w-8"><OChonTatCa /></TableHead>}
                    <TableHead>Mã sinh viên</TableHead>
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Lớp</TableHead>
                    <TableHead>Minh chứng CK</TableHead>
                    {dsThanhPhan.length > 0 ? (
                      <>
                        {dsThanhPhan.map((tp) => (
                          <TableHead key={tp.id}>
                            {tp.ten}
                            {!tp.batBuoc && <span className="ml-1 text-xs font-normal text-muted-foreground">(tùy chọn)</span>}
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Tổng đã nộp</TableHead>
                      </>
                    ) : (
                      <TableHead>Lệ phí</TableHead>
                    )}
                    <TableHead>Hồ sơ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trangLePhi.dsTrang.map((d) => (
                    <TableRow key={d.dangKy.id}>
                      {hdDoiSoat.length > 0 && <TableCell className="w-8">{d.hocPhi && <OChon id={d.hocPhi.id} nhan={d.hocVien.hoTen} />}</TableCell>}
                      <TableCell className="font-mono">{d.hocVien.maSinhVien ?? d.hocVien.maHocVien}</TableCell>
                      <TableCell>{d.hocVien.hoTen}</TableCell>
                      <TableCell>{d.hocVien.lopSinhHoat ?? "—"}</TableCell>
                      <TableCell>
                        {d.minhChung ? (
                          <a href={`/api/hv/tep-ho-so/${d.minhChung.id}?xem=1`} target="_blank" className="underline">
                            Xem ({d.minhChung.taiLenLuc.toLocaleDateString("vi-VN")})
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Chưa nộp</span>
                        )}
                      </TableCell>
                      {dsThanhPhan.length > 0 ? (
                        <>
                          {dsThanhPhan.map((tp) => {
                            const dong = d.hocPhi?.thanhPhans.find((x) => x.thanhPhanId === tp.id);
                            return (
                              <TableCell key={tp.id}>
                                {!dong ? (
                                  <span className="text-xs text-muted-foreground">Không đăng ký</span>
                                ) : choPhepThanhToan && ["CHUA_NOP", "CON_NO", "DA_NOP_DU"].includes(dong.trangThai) ? (
                                  <NutTrangThaiLePhi
                                    khoaId={khoa.id}
                                    hocPhiId={d.hocPhi!.id}
                                    hoTen={d.hocVien.hoTen}
                                    trangThai={dong.trangThai}
                                    soTienPhaiNop={Number(dong.soTienPhaiNop)}
                                    soTienDaNop={Number(dong.soTienDaNop)}
                                    thanhPhan={{ hocPhiThanhPhanId: dong.id, ten: tp.ten, batBuoc: tp.batBuoc }}
                                  />
                                ) : (
                                  <NhanTrangThai ma={dong.trangThai}>{NHAN_LE_PHI[dong.trangThai] ?? dong.trangThai}</NhanTrangThai>
                                )}
                                {dong && <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">{dinhDangTien(dong.soTienPhaiNop)}</div>}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right text-xs whitespace-nowrap tabular-nums">
                            {d.hocPhi ? (
                              <>
                                <b className="text-sm">{dinhDangTien(d.hocPhi.soTienDaNop)}</b>
                                <div className="text-muted-foreground">/ {dinhDangTien(d.hocPhi.soTienPhaiNop)}</div>
                              </>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </>
                      ) : (
                      <TableCell>
                        {d.hocPhi && choPhepThanhToan && ["CHUA_NOP", "CON_NO", "DA_NOP_DU"].includes(d.hocPhi.trangThai) ? (
                          <NutTrangThaiLePhi
                            khoaId={khoa.id}
                            hocPhiId={d.hocPhi.id}
                            hoTen={d.hocVien.hoTen}
                            trangThai={d.hocPhi.trangThai}
                            soTienPhaiNop={Number(d.hocPhi.soTienPhaiNop)}
                            soTienDaNop={Number(d.hocPhi.soTienDaNop)}
                          />
                        ) : d.hocPhi ? (
                          <NhanTrangThai ma={d.hocPhi.trangThai}>{NHAN_LE_PHI[d.hocPhi.trangThai] ?? d.hocPhi.trangThai}</NhanTrangThai>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      )}
                      <TableCell>
                        <NhanTrangThai ma={d.dangKy.trangThai}>{NHAN_HO_SO[d.dangKy.trangThai] ?? d.dangKy.trangThai}</NhanTrangThai>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </KhungChonNhieu>
          )}
          {thanhPhanTrang(trangLePhi)}
          {choPhepThanhToan && <FormDoiSoat khoaId={khoa.id} />}
        </section>
      )}

      {muc === "chinh-thuc" && (
        <section className="flex flex-col gap-3">
          {(choPhepThanhToan || choPhepXetDuyet) && (
            <>
              <h2 className="mt-2 text-sm font-bold text-ued-blue-dam">Danh sách chính thức dự thi</h2>
              <KhoiChotDanhSach
                khoaId={khoa.id}
                duocChot={duocChot}
                lyDoChuaChot={
                  duocChot
                    ? null
                    : khoa.trangThai === "DANG_TUYEN_SINH"
                      ? khoa.hanDangKy
                        ? `Chốt được sau hạn đăng ký ${dinhDangNgay(khoa.hanDangKy)}.`
                        : "Khóa chưa đặt hạn đăng ký (tab Tổng quan) - chốt được khi hết hạn hoặc khi khóa chuyển sang Đang diễn ra."
                      : "Khóa chưa mở tuyển sinh hoặc đã hủy."
                }
                soChinhThuc={soChinhThuc}
              />
            </>
          )}
          {soChinhThuc > 0 && (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                {!(choPhepThanhToan || choPhepXetDuyet) ? (
                  <h2 className="mt-2 text-sm font-bold text-ued-blue-dam">Danh sách chính thức dự thi</h2>
                ) : (
                  <span />
                )}
                {oTim(trangChinhThuc)}
              </div>
              {trangChinhThuc.tuKhoa && trangChinhThuc.tongDong === 0 && <KhongKhop tuKhoa={trangChinhThuc.tuKhoa} />}
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">STT</TableHead>
                      <TableHead>Mã sinh viên</TableHead>
                      <TableHead>Họ tên</TableHead>
                      <TableHead>Lớp</TableHead>
                      <TableHead>Lệ phí</TableHead>
                      <TableHead>Hồ sơ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trangChinhThuc.dsTrang.map((d, i) => (
                      <TableRow key={d.dangKy.id}>
                        <TableCell>{trangChinhThuc.tuDong + i + 1}</TableCell>
                        <TableCell className="font-mono">{d.hocVien.maSinhVien ?? d.hocVien.maHocVien}</TableCell>
                        <TableCell>{d.hocVien.hoTen}</TableCell>
                        <TableCell>{d.hocVien.lopSinhHoat ?? "—"}</TableCell>
                        <TableCell>
                          {d.hocPhi ? (
                            <NhanTrangThai ma={d.hocPhi.trangThai}>{NHAN_LE_PHI[d.hocPhi.trangThai] ?? d.hocPhi.trangThai}</NhanTrangThai>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <NhanTrangThai ma={d.dangKy.trangThai}>{NHAN_HO_SO[d.dangKy.trangThai] ?? d.dangKy.trangThai}</NhanTrangThai>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {thanhPhanTrang(trangChinhThuc)}
            </>
          )}
        </section>
      )}

      {muc === "cong-no" && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="text-sm font-bold text-ued-blue-dam">HP-02/03 · Công nợ theo học viên</h2>
              <a href="/hoc-phi/bao-cao" className="text-sm underline">
                Báo cáo doanh thu/công nợ (HP-05)
              </a>
            </div>
            {dsHocPhi.length > 0 && oTim(trangCongNo)}
          </div>
          {trangCongNo.tuKhoa && trangCongNo.tongDong === 0 && <KhongKhop tuKhoa={trangCongNo.tuKhoa} />}
          <KhungChonNhieu dsIdTrang={trangCongNo.dsTrang.map((hp) => hp.id)} dsIdTatCa={trangCongNo.dsLoc.map((hp) => hp.id)} hanhDong={hdCongNo} donVi="học viên">
          <Table>
            <TableHeader>
              <TableRow>
                {hdCongNo.length > 0 && <TableHead className="w-8"><OChonTatCa /></TableHead>}
                <TableHead>Học viên</TableHead>
                <TableHead>Phải nộp</TableHead>
                <TableHead>Đã nộp</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Hạn nộp</TableHead>
                <TableHead>Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trangCongNo.dsTrang.map((hp) => (
                <HangHocPhi
                  key={hp.id}
                  khoaId={khoa.id}
                  hocPhi={{
                    id: hp.id,
                    hoTen: hp.hocVien.hoTen,
                    soTienPhaiNop: Number(hp.soTienPhaiNop),
                    soTienDaNop: Number(hp.soTienDaNop),
                    trangThai: hp.trangThai,
                    hanNop: hp.hanNop?.toISOString() ?? null,
                    boQuaKiemTra: hp.boQuaKiemTra,
                  }}
                  choPhepThanhToan={choPhepThanhToan}
                  choPhepCongNo={choPhepCongNo}
                  choPhepBoQua={choPhepBoQua}
                  coChon={hdCongNo.length > 0}
                />
              ))}
            </TableBody>
          </Table>
          </KhungChonNhieu>
          {thanhPhanTrang(trangCongNo)}
          {dsHocPhi.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {laDuThi
                ? "Chưa có dòng lệ phí nào - phát sinh khi thí sinh đăng ký sau khi khóa đã có mức lệ phí (HP-01)."
                : "Chưa có dòng công nợ nào - chỉ phát sinh sau khi thiết lập mức học phí (HP-01) và có học viên Chính thức (HV-07)."}
            </p>
          )}
        </section>
      )}

      {muc === "phieu-thu" && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-sm font-bold text-ued-blue-dam">HP-04 · Phiếu thu đã lập ({dsPhieuThu.length})</h2>
            {dsPhieuThu.length > 0 && oTim(trangPhieuThu, "Số phiếu / họ tên / mã SV / CCCD")}
          </div>
          {trangPhieuThu.tuKhoa && trangPhieuThu.tongDong === 0 && <KhongKhop tuKhoa={trangPhieuThu.tuKhoa} />}
          <KhungChonNhieu dsIdTrang={trangPhieuThu.dsTrang.map((pt) => pt.id)} dsIdTatCa={trangPhieuThu.dsLoc.map((pt) => pt.id)} hanhDong={hdPhieuThu} donVi="phiếu">
          <Table>
            <TableHeader>
              <TableRow>
                {hdPhieuThu.length > 0 && <TableHead className="w-8"><OChonTatCa /></TableHead>}
                <TableHead>Số phiếu</TableHead>
                <TableHead>Học viên</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Ngày lập</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trangPhieuThu.dsTrang.map((pt) => (
                <TableRow key={pt.id} className={pt.daHuy ? "text-muted-foreground line-through" : undefined}>
                  {hdPhieuThu.length > 0 && <TableCell className="w-8"><OChon id={pt.id} nhan={pt.soPhieu} /></TableCell>}
                  <TableCell className="font-mono">
                    {pt.soPhieu}
                    {pt.daHuy && <span className="ml-1 inline-block text-xs text-destructive no-underline">(Đã hủy)</span>}
                  </TableCell>
                  <TableCell>{pt.hocPhi.hocVien.hoTen}</TableCell>
                  <TableCell>{Number(pt.soTien).toLocaleString("vi-VN")}đ</TableCell>
                  <TableCell>{pt.ngayLap.toLocaleString("vi-VN")}</TableCell>
                  <TableCell>
                    <a href={`/hoc-phi/phieu-thu/${pt.id}`} className="text-sm underline" target="_blank">
                      In phiếu
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </KhungChonNhieu>
          {thanhPhanTrang(trangPhieuThu)}
        </section>
      )}

      {muc === "muc-phi" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ued-blue-dam">HP-01 · Thiết lập mức {laDuThi ? "lệ phí" : "học phí"}</h2>
          {dsThanhPhan.length === 0 && (
          <FormThietLap
            khoaId={khoa.id}
            mucHocPhi={khoa.mucHocPhi ? Number(khoa.mucHocPhi) : null}
            chinhSachMienGiam={khoa.chinhSachMienGiam}
            daCoDangKy={dsHocPhi.length > 0}
            theoDoiTuong={theoDoiTuong}
            mucHocPhiTuDo={khoa.mucHocPhiTuDo === null ? null : Number(khoa.mucHocPhiTuDo)}
          />
          )}
          {laDuThi && (
            <>
              <h3 className="mt-2 text-sm font-semibold">
                Thành phần lệ phí{dsThanhPhan.length === 0 && " (không bắt buộc - vd. tách Đăng ký ôn thi và Đăng ký thi)"}
              </h3>
              <CauHinhThanhPhanLePhi
                key={dsThanhPhan.map((t) => `${t.id}:${t.ten}:${t.mucSinhVien}:${t.mucTuDo}:${t.thuTu}`).join("|")}
                khoaId={khoa.id}
                theoDoiTuong={theoDoiTuong}
                daCoDangKy={bangLePhi.length > 0}
                dsBanDau={dsThanhPhan.map((t) => ({
                  id: t.id,
                  ten: t.ten,
                  batBuoc: t.batBuoc,
                  mucSinhVien: String(Number(t.mucSinhVien)),
                  mucTuDo: t.mucTuDo === null ? "" : String(Number(t.mucTuDo)),
                }))}
              />
            </>
          )}
        </section>
      )}
    </main>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FormTepDanhSach } from "./form-tep-danh-sach";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa, danhSachKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { danhSachChoNopGiay } from "@/server/services/hv/hv-02-xac-nhan-nop-giay";
import { danhSachChoTuXacNhan } from "@/server/services/hv/hv-03-import-danh-sach";
import { danhSachThiSinh } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import { danhSachDaThamDinh, minhChungThieuTheoKhoa } from "@/server/services/hv/hv-06-tham-dinh";
import { cauHinhHieuLuc, hoSoBoSungTheoDs } from "@/server/services/hv/form-dang-ky";
import { danhSachChucDanhHocVi } from "@/server/services/dm/dm-02-chuc-danh-hoc-vi";
import { coQuyen } from "@/lib/auth/guard";
import { KhoiFormDangKy } from "../khoi-form-dang-ky";
import { KhoiMauDon } from "../khoi-mau-don";
import { SuaThongTinDanhSach } from "@/components/dang-ky/sua-thong-tin-danh-sach";
import { bienCuaKhoa, mauDonHieuLuc } from "@/server/services/chung/mau-in";
import { ChiTietHoSo } from "@/components/dang-ky/chi-tiet-ho-so";
import { danhSachChoDuyet, danhSachChinhThuc } from "@/server/services/hv/hv-07-xet-duyet-chinh-thuc";
import { danhSachHocVienTheoKhoa, lichSuThayDoiDanhSach, NHAN_HANH_DONG_HV09 } from "@/server/services/hv/hv-09-quan-ly-danh-sach-khoa";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";
import { DauTrangKhoa } from "@/components/khoa/dau-trang-khoa";
import { FormImport } from "../form-import";
import { cotMauImport } from "@/server/services/hv/hv-03-import-danh-sach";
import { FormThamDinh } from "../form-tham-dinh";
import { danhSachTheoThanhPhan } from "@/server/services/hp/hp-01-thanh-phan-le-phi";
import { lePhiTheoHocVien, thuocDanhSachThanhPhan, type LePhiThanhPhan } from "@/server/services/hv/xuat-danh-sach-tuyen-sinh";
import { KhongKhop, OTimKiem, PhanTrang, locVaPhanTrang, thamSoPhang, type ThamSoUrl } from "@/components/chung/phan-trang";
import { FormThemHocVien } from "../form-them-hoc-vien";
import { FormChuyenKhoa } from "../form-chuyen-khoa";
import { FormXoaHocVien } from "../form-xoa-hoc-vien";
import { xacNhanNopGiayAction, ghiNhanThoiHocAction, tuChoiThieuMinhChungAction } from "../actions";
import { KhungChonNhieu, OChon, OChonTatCa, type HanhDongLo } from "@/components/chung/chon-nhieu";
import {
  chuyenKhoaLoAction,
  duyetHoSoLoAction,
  thamDinhLoAction,
  thoiHocLoAction,
  xacNhanNopGiayLoAction,
  xoaKhoiKhoaLoAction,
} from "../actions-lo";

const NHAN_LE_PHI_TP: Record<string, string> = { CHUA_NOP: "Chưa đóng", CON_NO: "Nộp thiếu", DA_NOP_DU: "Đã đóng", MIEN_GIAM: "Miễn giảm" };

const NHAN_TRANG_THAI_DANG_KY: Record<string, string> = {
  CHO_NOP_GIAY: "Chờ nộp bản giấy",
  DA_NOP_GIAY: "Đã nộp bản giấy - chờ duyệt",
  HUY_QUA_HAN_NOP_GIAY: "Hủy (quá hạn nộp giấy)",
  CHO_TU_XAC_NHAN: "Chờ tự xác nhận",
  DA_XAC_NHAN_THAM_GIA: "Đã xác nhận tham gia",
  CHO_DUYET: "Chờ duyệt",
  HOP_LE: "Hợp lệ",
  KHONG_HOP_LE: "Không hợp lệ",
  CHINH_THUC: "Chính thức",
  HOAN_THANH: "Hoàn thành",
  THOI_HOC: "Thôi học",
};

// (bổ sung 05/10/2026 - HV-06) in đơn + điều chỉnh thông tin thí sinh trên từng hồ sơ
function ThaoTacHoSo({ khoaId, maKhoa, dangKyId, sua }: { khoaId: string; maKhoa: string; dangKyId: string; sua?: unknown }) {
  return (
    <>
    <SuaThongTinDanhSach sua={sua} className="mt-1" />
    <div className="mt-1 flex gap-3 text-xs">
      <Link href={`/khoa/${maKhoa}/don-dang-ky/${dangKyId}`} target="_blank" className="text-primary underline">
        In đơn
      </Link>
      <Link href={`/khoa-hoc/${khoaId}/tuyen-sinh/ho-so/${dangKyId}`} className="text-primary underline">
        Điều chỉnh
      </Link>
    </div>
    </>
  );
}

// Tab Tuyển sinh của khóa: hồ sơ theo phương thức (HV-02/03/05), duyệt hồ sơ 1 bước (HV-06 + HV-07), danh sách (HV-09)
export default async function TuyenSinhKhoaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ThamSoUrl>;
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

  const { id } = await params;
  const khoa = await layKhoa(id);
  if (!khoa) notFound();

  const [
    dsChoNopGiay,
    dsChoTuXacNhan,
    dsThiSinh,
    dsChoDuyet,
    dsDaThamDinh,
    dsChinhThuc,
    dsHocVienTheoKhoa,
    dsKhoaKhac,
    lichSuDanhSach,
  ] = await Promise.all([
    danhSachChoNopGiay(id),
    danhSachChoTuXacNhan(id),
    danhSachThiSinh(id),
    danhSachChoDuyet(id),
    danhSachDaThamDinh(id),
    danhSachChinhThuc(id),
    danhSachHocVienTheoKhoa(id, true),
    danhSachKhoa(),
    lichSuThayDoiDanhSach(id),
  ]);
  // (bổ sung 30/09/2026) thông tin bổ sung + minh chứng theo form đăng ký cấu hình
  // (bổ sung 07/10/2026) quyền của từng nhóm thao tác hàng loạt
  const [quyenNopGiay, quyenThamDinh, quyenXetDuyet, quyenDanhSach] = await Promise.all(["HV-02", "HV-06", "HV-07", "HV-09"].map(coQuyen));
  const [hoSo, thieuMinhChung, formDangKy, dsChucDanh, suaForm] = await Promise.all([
    hoSoBoSungTheoDs([...dsChoNopGiay, ...dsChoDuyet, ...dsDaThamDinh].map((d) => d.id)),
    minhChungThieuTheoKhoa(id),
    cauHinhHieuLuc(id),
    danhSachChucDanhHocVi(),
    coQuyen("KH-06"),
  ]);
  // (bổ sung 06/10/2026) mỗi danh sách có ô tìm nhanh (họ tên/mã SV/CCCD) và phân trang 20 dòng riêng
  const sp = await searchParams;
  const duong = `/khoa-hoc/${id}/tuyen-sinh`;
  const thamSo = thamSoPhang(sp);
  const hv = (dk: { hocVien: { hoTen: string; soCCCD: string | null; maSinhVien: string | null; maHocVien: string } }) => dk.hocVien;
  const trangNopGiay = locVaPhanTrang(dsChoNopGiay, sp, "ng", hv);
  const trangTuXacNhan = locVaPhanTrang(dsChoTuXacNhan, sp, "xn", hv, (dk) => [dk.hocVien.donViCongTac]);
  const trangThiSinh = locVaPhanTrang(dsThiSinh, sp, "ts", hv, (dk) => [dk.hocVien.lopSinhHoat]);
  // (bổ sung 06/10/2026) khóa chia thành phần lệ phí: danh sách riêng theo từng thành phần (vd. ôn thi, thi)
  const dsTheoThanhPhan = khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI") ? await danhSachTheoThanhPhan(id) : [];
  const tpChon = dsTheoThanhPhan.find((x) => x.thanhPhan.id === thamSo.tp);
  const trangThanhPhan = locVaPhanTrang(tpChon?.ds ?? [], sp, "tp", (d) => d.hocPhi.hocVien, (d) => [d.hocPhi.hocVien.lopSinhHoat]);
  // (sửa 11/10/2026) thẩm định + xét duyệt gộp 1 bước; danh sách Không hợp lệ để tra cứu
  const dsKhongHopLe = dsDaThamDinh.filter((dk) => dk.trangThai === "KHONG_HOP_LE");
  const trangKhongHopLe = locVaPhanTrang(dsKhongHopLe, sp, "dtd", hv);
  // (bổ sung 12/10/2026) khóa dự thi chia thành phần lệ phí (vd. ôn thi, thi): mỗi thành phần 1 cột lệ phí khi duyệt,
  // danh sách chính thức tách theo thành phần (đã chọn và đã được xác nhận thành phần đó)
  const dsTp = dsTheoThanhPhan.map((x) => x.thanhPhan);
  const lePhiTp = dsTp.length > 0 ? await lePhiTheoHocVien(id, [...dsChoDuyet, ...dsHocVienTheoKhoa].map((d) => d.hocVienId)) : new Map();
  const coHocPhi = dsTp.length === 0 && dsChoDuyet.some((dk) => dk.hocPhi);
  const ctpChon = dsTp.find((t) => t.id === thamSo.ctp);
  // (bổ sung 13/10/2026) lọc danh sách chờ duyệt theo lệ phí để chọn tất cả và duyệt chính thức nhanh:
  // du = đủ điều kiện duyệt (lệ phí bắt buộc đã xác nhận), chua = chưa xác nhận, tp_<id> = đã đóng thành phần tùy chọn
  const tpBatBuoc = dsTp.filter((t) => t.batBuoc);
  const boLocDuyet = [
    { ma: "", nhan: "Tất cả", loc: () => true },
    {
      ma: "du",
      nhan: tpBatBuoc.length === 1 ? `Lệ phí ${tpBatBuoc[0].ten.toLowerCase()} đã đóng` : "Đủ điều kiện duyệt (đã xác nhận lệ phí)",
      loc: (dk: (typeof dsChoDuyet)[number]) => dk.duocDuyet,
    },
    { ma: "chua", nhan: "Chưa xác nhận lệ phí", loc: (dk: (typeof dsChoDuyet)[number]) => !dk.duocDuyet },
    ...dsTp
      .filter((t) => !t.batBuoc)
      .map((t) => ({
        ma: `tp_${t.id}`,
        nhan: `Lệ phí ${t.ten.toLowerCase()} đã đóng`,
        loc: (dk: (typeof dsChoDuyet)[number]) => lePhiTp.get(dk.hocVienId)?.thanhPhan.get(t.id)?.daXacNhan === true,
      })),
  ].map((b) => ({ ...b, so: dsChoDuyet.filter(b.loc).length }));
  const locDuyet = boLocDuyet.find((b) => b.ma === thamSo.ld) ?? boLocDuyet[0];
  const coBoLocDuyet = boLocDuyet.some((b) => b.ma && b.so > 0 && b.so < dsChoDuyet.length);
  const trangChoDuyet = locVaPhanTrang(dsChoDuyet.filter(locDuyet.loc), sp, "td", hv);
  const lienKetLoc = (ma: string) => {
    const q = new URLSearchParams(Object.entries(thamSo).filter((e): e is [string, string] => typeof e[1] === "string"));
    q.delete("td_trang");
    if (ma) q.set("ld", ma);
    else q.delete("ld");
    const chuoi = q.toString();
    return chuoi ? `${duong}?${chuoi}` : duong;
  };
  const dsChinhThucHienThi = ctpChon ? dsHocVienTheoKhoa.filter((dk) => thuocDanhSachThanhPhan(lePhiTp.get(dk.hocVienId), ctpChon.id)) : dsHocVienTheoKhoa;
  const trangHocVien = locVaPhanTrang(dsChinhThucHienThi, sp, "hv", hv);
  const oLePhiTp = (lp: LePhiThanhPhan | undefined) =>
    !lp ? (
      <span className="text-xs text-muted-foreground">Không đăng ký</span>
    ) : lp.daXacNhan ? (
      <span className="text-xs text-success">{lp.nhan}</span>
    ) : (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800 ring-1 ring-amber-600/30">{lp.nhan}</span>
    );
  // (bổ sung 12/10/2026) xuất Excel mọi danh sách của tab
  const xuatExcel = (loai: string, tp?: string) => (
    <a
      href={`/api/hv/khoa/${khoa.id}/xuat-danh-sach?loai=${loai}${tp ? `&tp=${tp}` : ""}`}
      className="text-sm font-normal text-primary underline"
    >
      Xuất Excel
    </a>
  );
  const coXuat = (h: React.ReactNode, loai: string, tp?: string) => (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      {h}
      {xuatExcel(loai, tp)}
    </div>
  );
  const trangLichSu = locVaPhanTrang(lichSuDanhSach, sp, "ls", (ls) => ({ hoTen: ls.chiTiet }), (ls) => [ls.nguoiThucHienTen]);
  const thanhPhanTrang = (t: { ma: string; trang: number; tongTrang: number; tongDong: number; soDong: number }) => (
    <PhanTrang duong={duong} thamSo={thamSo} ten={`${t.ma}_trang`} trang={t.trang} tongTrang={t.tongTrang} tongDong={t.tongDong} soDong={t.soDong} />
  );
  const oTim = (t: { ma: string; tuKhoa: string; tongDong: number; tongGoc: number }, goiY?: string) =>
    (t.tongGoc > 0 || t.tuKhoa) && <OTimKiem duong={duong} thamSo={thamSo} ma={t.ma} tuKhoa={t.tuKhoa} ketQua={t.tongDong} goiY={goiY} />;
  const khongKhop = (t: { tuKhoa: string; tongDong: number }) => t.tuKhoa && t.tongDong === 0 && <KhongKhop tuKhoa={t.tuKhoa} />;
  const tieuDe = (h: React.ReactNode, t: Parameters<typeof oTim>[0], goiY?: string) => (
    <div className="flex flex-wrap items-end justify-between gap-3">
      {h}
      {oTim(t, goiY)}
    </div>
  );

  const dsKhoaKhacRutGon = dsKhoaKhac
    .filter((k) => k.id !== khoa.id)
    .map((k) => ({ id: k.id, maKhoa: k.maKhoa }));

  // (bổ sung 07/10/2026) chọn nhiều hồ sơ + thao tác hàng loạt trên từng danh sách
  const ids = <T extends { id: string }>(ds: T[]) => ds.map((d) => d.id);
  const hdNopGiay: HanhDongLo[] = quyenNopGiay
    ? [{ ma: "nop-giay", nhan: "Xác nhận đã nhận hồ sơ giấy", xacNhan: "Xác nhận đã nhận bản giấy?", thucHien: xacNhanNopGiayLoAction.bind(null, khoa.id) }]
    : [];
  // (sửa 11/10/2026 - HV-06/HV-07 gộp 1 bước) duyệt thẳng vào danh sách chính thức hoặc Không hợp lệ
  const hdDuyet: HanhDongLo[] = [
    ...(quyenXetDuyet
      ? [
          {
            ma: "duyet",
            nhan: "Duyệt chính thức",
            xacNhan:
              "Duyệt các hồ sơ đã chọn vào danh sách chính thức? Có hồ sơ chưa được xác nhận học phí/lệ phí, thiếu minh chứng hoặc vượt sĩ số thì không duyệt hồ sơ nào.",
            thucHien: duyetHoSoLoAction.bind(null, khoa.id),
          },
        ]
      : []),
    ...(quyenThamDinh
      ? [
          {
            ma: "khong-hop-le",
            nhan: "Không hợp lệ",
            nguyHiem: true,
            truong: [{ ten: "lyDo", nhan: "Lý do không hợp lệ", loai: "text" as const, batBuoc: true }],
            thucHien: thamDinhLoAction.bind(null, khoa.id, "KHONG_HOP_LE"),
          },
        ]
      : []),
  ];
  const hdDanhSach: HanhDongLo[] = quyenDanhSach
    ? [
        {
          ma: "thoi-hoc",
          nhan: "Ghi nhận thôi học",
          truong: [{ ten: "lyDo", nhan: "Lý do", loai: "text", goiY: "Không bắt buộc" }],
          xacNhan: "Ghi nhận thôi học cho các học viên đã chọn?",
          thucHien: thoiHocLoAction.bind(null, khoa.id),
        },
        ...(dsKhoaKhacRutGon.length > 0
          ? [
              {
                ma: "chuyen-khoa",
                nhan: "Chuyển khóa",
                truong: [
                  { ten: "khoaMoiId", nhan: "Chuyển sang khóa", loai: "select" as const, ds: dsKhoaKhacRutGon.map((k) => ({ gt: k.id, nhan: k.maKhoa })) },
                  { ten: "lyDo", nhan: "Lý do", loai: "text" as const, goiY: "Không bắt buộc" },
                ],
                xacNhan: "Chuyển các học viên đã chọn sang khóa khác (xét duyệt lại theo khóa đích)?",
                thucHien: chuyenKhoaLoAction.bind(null, khoa.id),
              },
            ]
          : []),
        {
          ma: "xoa",
          nhan: "Xóa khỏi khóa",
          nguyHiem: true,
          truong: [{ ten: "lyDo", nhan: "Lý do", loai: "text", goiY: "Không bắt buộc" }],
          xacNhan: "Xóa các học viên đã chọn khỏi khóa? Học viên đã học/đã có điểm thì dùng Ghi nhận thôi học.",
          thucHien: xoaKhoiKhoaLoAction.bind(null, khoa.id),
        },
      ]
    : [];
  const oDau = (co: boolean) => co && <TableHead className="w-8"><OChonTatCa /></TableHead>;
  const oDong = (co: boolean, id: string, ten: string) => co && <TableCell className="w-8"><OChon id={id} nhan={ten} /></TableCell>;

  const mauDon = await mauDonHieuLuc(khoa.id);

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <DauTrangKhoa khoa={khoa} dangChon="tuyen-sinh" />
      <KhoiFormDangKy
        khoaId={khoa.id}
        chuongTrinhId={khoa.chuongTrinh.id}
        nguon={formDangKy.nguon}
        cauHinh={formDangKy.cauHinh}
        dsChucDanh={dsChucDanh.map((c) => ({ id: c.id, ten: c.ten }))}
        duocSua={suaForm && khoa.trangThai !== "DA_KET_THUC" && khoa.trangThai !== "HUY"}
        choPhepMaSinhVien={khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI")}
      />
      <KhoiMauDon
        khoaId={khoa.id}
        chuongTrinhId={khoa.chuongTrinh.id}
        nguon={mauDon.nguon}
        mau={mauDon.mau}
        laDuThi={mauDon.laDuThi}
        bien={await bienCuaKhoa(mauDon.khoa)}
        duocSua={suaForm && khoa.trangThai !== "DA_KET_THUC" && khoa.trangThai !== "HUY"}
      />
      {khoa.chuongTrinh.phuongThucDangKys.includes("TRUC_TUYEN_NOP_GIAY") && (
        <section className="flex flex-col gap-3">
          {tieuDe(coXuat(<h2 className="text-base font-bold text-ued-blue-dam">HV-02 · Xác nhận đã nhận hồ sơ giấy</h2>, "nop-giay"), trangNopGiay)}
          {khongKhop(trangNopGiay)}

          <KhungChonNhieu dsIdTrang={ids(trangNopGiay.dsTrang)} dsIdTatCa={ids(trangNopGiay.dsLoc)} hanhDong={hdNopGiay} donVi="hồ sơ">
          <Table>
            <TableHeader>
              <TableRow>
                {oDau(hdNopGiay.length > 0)}
                <TableHead>Học viên</TableHead>
                <TableHead>CCCD</TableHead>
                <TableHead>Ngày đăng ký</TableHead>
                <TableHead>Hạn nộp giấy</TableHead>
                <TableHead>Thông tin bổ sung · minh chứng</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {trangNopGiay.dsTrang.map((dk) => (
                <TableRow key={dk.id}>
                  {oDong(hdNopGiay.length > 0, dk.id, dk.hocVien.hoTen)}
                  <TableCell>{dk.hocVien.hoTen}</TableCell>
                  <TableCell>{dk.hocVien.soCCCD ?? "—"}</TableCell>
                  <TableCell>{new Date(dk.ngayDangKy).toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell>
                    {dk.hanNopGiay ? new Date(dk.hanNopGiay).toLocaleDateString("vi-VN") : "—"}
                  </TableCell>
                  <TableCell>
                    <ChiTietHoSo hoSo={hoSo.get(dk.id)} />
                  </TableCell>
                  <TableCell>
                    <form action={xacNhanNopGiayAction.bind(null, khoa.id, dk.id)}>
                      <Button type="submit" variant="secondary" className="h-7 px-2 text-xs">
                        Xác nhận đã nhận
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {dsChoNopGiay.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    Không có hồ sơ nào đang chờ nộp bản giấy
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </KhungChonNhieu>
          {thanhPhanTrang(trangNopGiay)}
        </section>
      )}

      {khoa.chuongTrinh.phuongThucDangKys.includes("IMPORT_TU_XAC_NHAN") && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-ued-blue-dam">HV-03 · Import danh sách học viên</h2>

          <FormImport khoaId={khoa.id} dsCot={await cotMauImport(khoa.id)} />
          {tieuDe(xuatExcel("tu-xac-nhan"), trangTuXacNhan, "Họ tên / CCCD / đơn vị công tác")}
          {khongKhop(trangTuXacNhan)}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Học viên</TableHead>
                <TableHead>CCCD/mã số</TableHead>
                <TableHead>Đơn vị công tác</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trangTuXacNhan.dsTrang.map((dk) => (
                <TableRow key={dk.id}>
                  <TableCell>{dk.hocVien.hoTen}</TableCell>
                  <TableCell>{dk.hocVien.soCCCD ?? "—"}</TableCell>
                  <TableCell>{dk.hocVien.donViCongTac ?? "—"}</TableCell>
                  <TableCell>Chờ tự xác nhận</TableCell>
                </TableRow>
              ))}
              {dsChoTuXacNhan.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Chưa có học viên nào được import
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {thanhPhanTrang(trangTuXacNhan)}
        </section>
      )}

      {khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI") && (
        <section className="flex flex-col gap-3">
          {dsTheoThanhPhan.length > 0 && (
            <nav aria-label="Danh sách theo thành phần" className="flex flex-wrap gap-1.5">
              {[{ id: "", ten: "Tất cả thí sinh", so: dsThiSinh.length }, ...dsTheoThanhPhan.map((x) => ({ id: x.thanhPhan.id, ten: `Danh sách ${x.thanhPhan.ten.toLowerCase()}`, so: x.ds.length }))].map((t) => (
                <Link
                  key={t.id || "tat-ca"}
                  href={t.id ? `${duong}?tp=${t.id}` : duong}
                  scroll={false}
                  aria-current={(tpChon?.thanhPhan.id ?? "") === t.id ? "page" : undefined}
                  className={
                    "rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap " +
                    ((tpChon?.thanhPhan.id ?? "") === t.id ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted")
                  }
                >
                  {t.ten} <span className="ml-1 text-xs opacity-80">{t.so}</span>
                </Link>
              ))}
            </nav>
          )}
          {tpChon ? (
            <>
              {tieuDe(
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h2 className="text-base font-bold text-ued-blue-dam">
                    HV-05 · Danh sách {tpChon.thanhPhan.ten.toLowerCase()} ({tpChon.ds.length})
                  </h2>
                  <a href={`/api/hv/khoa/${khoa.id}/thanh-phan/${tpChon.thanhPhan.id}`} className="text-sm text-primary underline">
                    Tải Excel
                  </a>
                </div>,
                trangThanhPhan,
              )}
              {khongKhop(trangThanhPhan)}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">STT</TableHead>
                    <TableHead>Thí sinh</TableHead>
                    <TableHead>Mã SV · lớp</TableHead>
                    <TableHead>CCCD</TableHead>
                    <TableHead>Lệ phí {tpChon.thanhPhan.ten.toLowerCase()}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trangThanhPhan.dsTrang.map((d, i) => (
                    <TableRow key={d.id}>
                      <TableCell>{trangThanhPhan.tuDong + i + 1}</TableCell>
                      <TableCell>{d.hocPhi.hocVien.hoTen}</TableCell>
                      <TableCell>
                        {d.hocPhi.hocVien.maSinhVien ? (
                          <>
                            <span className="font-mono">{d.hocPhi.hocVien.maSinhVien}</span> · {d.hocPhi.hocVien.lopSinhHoat ?? "—"}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Thí sinh tự do</span>
                        )}
                      </TableCell>
                      <TableCell>{d.hocPhi.hocVien.soCCCD ?? "—"}</TableCell>
                      <TableCell>
                        <NhanTrangThai ma={d.trangThai}>{NHAN_LE_PHI_TP[d.trangThai] ?? d.trangThai}</NhanTrangThai>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tpChon.ds.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        Chưa có thí sinh nào đăng ký {tpChon.thanhPhan.ten.toLowerCase()}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {thanhPhanTrang(trangThanhPhan)}
            </>
          ) : (
            <>
          {tieuDe(coXuat(<h2 className="text-base font-bold text-ued-blue-dam">HV-05 · Danh sách thí sinh dự thi ({dsThiSinh.length})</h2>, "thi-sinh"), trangThiSinh)}
          {khongKhop(trangThiSinh)}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thí sinh</TableHead>
                <TableHead>Mã SV · lớp</TableHead>
                <TableHead>CCCD</TableHead>
                <TableHead>Ngày đăng ký</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trangThiSinh.dsTrang.map((dk) => (
                <TableRow key={dk.id}>
                  <TableCell>{dk.hocVien.hoTen}</TableCell>
                  <TableCell>
                    {dk.hocVien.maSinhVien ? (
                      <>
                        <span className="font-mono">{dk.hocVien.maSinhVien}</span> · {dk.hocVien.lopSinhHoat ?? "—"}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Thí sinh tự do</span>
                    )}
                  </TableCell>
                  <TableCell>{dk.hocVien.soCCCD ?? "—"}</TableCell>
                  <TableCell>{new Date(dk.ngayDangKy).toLocaleDateString("vi-VN")}</TableCell>
                </TableRow>
              ))}
              {dsThiSinh.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Chưa có thí sinh nào đăng ký dự thi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {thanhPhanTrang(trangThiSinh)}
            </>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-ued-blue-dam">HV-06 · HV-07 · Duyệt hồ sơ vào danh sách chính thức</h2>
          {thieuMinhChung.size > 0 && (
            <form action={tuChoiThieuMinhChungAction.bind(null, khoa.id)} className="flex items-center gap-2">
              <span className="text-sm text-destructive">{thieuMinhChung.size} hồ sơ thiếu minh chứng bắt buộc</span>
              <Button type="submit" variant="destructive" size="sm">
                Từ chối tự động
              </Button>
            </form>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Hồ sơ Phương thức 1 và đăng ký dự thi chỉ được duyệt sau khi cán bộ tài chính xác nhận học phí/lệ phí (tab Học phí). Hồ sơ qua đơn vị
          liên kết và danh sách được cử đi học duyệt ngay.
        </p>
        {khoa.chuongTrinh.phuongThucDangKys.includes("TRUC_TUYEN_NOP_GIAY") && khoa.mucHocPhi === null && (
          <p className="rounded-lg border border-amber-600/30 bg-amber-50 p-3 text-sm text-amber-900">
            Khóa chưa thiết lập mức học phí (tab Học phí) - hồ sơ Phương thức 1 chưa có khoản học phí để xác nhận nên sẽ được duyệt như khóa
            không thu học phí.
          </p>
        )}

        <FormTepDanhSach khoaId={khoa.id} loai="xet-duyet" />
        <FormTepDanhSach khoaId={khoa.id} loai="tham-dinh" />

        {tieuDe(coXuat(<h3 className="text-sm font-semibold">Chờ duyệt ({dsChoDuyet.length})</h3>, "cho-duyet"), trangChoDuyet)}
        {(coBoLocDuyet || locDuyet.ma) && (
          <nav aria-label="Lọc theo lệ phí" className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-muted-foreground">Lọc:</span>
            {boLocDuyet.map((b) => (
              <Link
                key={b.ma || "tat-ca"}
                href={lienKetLoc(b.ma)}
                scroll={false}
                aria-current={locDuyet.ma === b.ma ? "page" : undefined}
                className={
                  "rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap " +
                  (locDuyet.ma === b.ma ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted")
                }
              >
                {b.nhan} <span className="ml-1 text-xs opacity-80">{b.so}</span>
              </Link>
            ))}
          </nav>
        )}
        {khongKhop(trangChoDuyet)}

        <KhungChonNhieu
          dsIdTrang={ids(trangChoDuyet.dsTrang)}
          dsIdTatCa={ids(trangChoDuyet.dsLoc)}
          hanhDong={hdDuyet}
          donVi="hồ sơ"
        >
          <Table>
            <TableHeader>
              <TableRow>
                {oDau(hdDuyet.length > 0)}
                <TableHead>Học viên</TableHead>
                <TableHead>Mã SV / CCCD</TableHead>
                <TableHead>Ngày đăng ký</TableHead>
                <TableHead>Thông tin bổ sung · minh chứng</TableHead>
                {coHocPhi && <TableHead>Học phí/lệ phí</TableHead>}
                {dsTp.map((t) => (
                  <TableHead key={t.id}>
                    Lệ phí {t.ten.toLowerCase()}
                    {t.batBuoc && <span className="block text-xs font-normal text-muted-foreground">bắt buộc</span>}
                  </TableHead>
                ))}
                <TableHead>Duyệt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trangChoDuyet.dsTrang.map((dk) => (
                <TableRow key={dk.id}>
                  {oDong(hdDuyet.length > 0, dk.id, dk.hocVien.hoTen)}
                  <TableCell>
                    {dk.hocVien.hoTen}
                    <span className="block text-xs text-muted-foreground">{NHAN_TRANG_THAI_DANG_KY[dk.trangThai] ?? dk.trangThai}</span>
                    <ThaoTacHoSo khoaId={khoa.id} maKhoa={khoa.maKhoa} dangKyId={dk.id} sua={dk.suaThongTinDanhSach} />
                  </TableCell>
                  <TableCell>{dk.hocVien.maSinhVien ?? dk.hocVien.soCCCD ?? "—"}</TableCell>
                  <TableCell>{new Date(dk.ngayDangKy).toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell>
                    <ChiTietHoSo hoSo={hoSo.get(dk.id)} thieu={thieuMinhChung.get(dk.id)} />
                  </TableCell>
                  {coHocPhi && (
                    <TableCell>
                      {!dk.hocPhi ? (
                        <span className="text-xs text-muted-foreground">Không áp dụng</span>
                      ) : dk.hocPhi.daXacNhan ? (
                        <span className="text-xs text-success">{dk.hocPhi.nhan}</span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800 ring-1 ring-amber-600/30">{dk.hocPhi.nhan}</span>
                      )}
                    </TableCell>
                  )}
                  {dsTp.map((t) => (
                    <TableCell key={t.id}>{oLePhiTp(lePhiTp.get(dk.hocVienId)?.thanhPhan.get(t.id))}</TableCell>
                  ))}
                  <TableCell>
                    <FormThamDinh khoaId={khoa.id} dangKyId={dk.id} duocDuyet={dk.duocDuyet} />
                  </TableCell>
                </TableRow>
              ))}
              {dsChoDuyet.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7 + dsTp.length} className="text-center text-sm text-muted-foreground">
                    Không có hồ sơ nào đang chờ duyệt
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </KhungChonNhieu>
        {thanhPhanTrang(trangChoDuyet)}

        {dsChinhThuc.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Đã có <strong className="text-foreground">{dsChinhThuc.length}</strong> học viên chính thức - xem ở danh sách HV-09 bên dưới.
          </p>
        )}

        {dsKhongHopLe.length > 0 && tieuDe(coXuat(<h3 className="text-sm font-semibold">Không hợp lệ ({dsKhongHopLe.length})</h3>, "khong-hop-le"), trangKhongHopLe)}
        {khongKhop(trangKhongHopLe)}
        {trangKhongHopLe.tongDong > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Học viên</TableHead>
                <TableHead>Thông tin bổ sung · minh chứng</TableHead>
                <TableHead>Lý do</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trangKhongHopLe.dsTrang.map((dk) => (
                <TableRow key={dk.id}>
                  <TableCell>
                    {dk.hocVien.hoTen}
                    <ThaoTacHoSo khoaId={khoa.id} maKhoa={khoa.maKhoa} dangKyId={dk.id} sua={dk.suaThongTinDanhSach} />
                  </TableCell>
                  <TableCell>
                    <ChiTietHoSo hoSo={hoSo.get(dk.id)} />
                  </TableCell>
                  <TableCell>{dk.ghiChuThamDinh ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {trangKhongHopLe.tongDong > 0 && thanhPhanTrang(trangKhongHopLe)}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-ued-blue-dam">HV-09 · Quản lý danh sách học viên theo khóa</h2>

        <FormThemHocVien khoaId={khoa.id} />
        {dsTp.length > 0 && (
          <nav aria-label="Danh sách chính thức theo thành phần" className="flex flex-wrap gap-1.5">
            {[
              { id: "", ten: "Tất cả", so: dsHocVienTheoKhoa.length },
              ...dsTp.map((t) => ({
                id: t.id,
                ten: t.ten,
                so: dsHocVienTheoKhoa.filter((dk) => thuocDanhSachThanhPhan(lePhiTp.get(dk.hocVienId), t.id)).length,
              })),
            ].map((t) => (
              <Link
                key={t.id || "tat-ca"}
                href={t.id ? `${duong}?ctp=${t.id}` : duong}
                scroll={false}
                aria-current={(ctpChon?.id ?? "") === t.id ? "page" : undefined}
                className={
                  "rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap " +
                  ((ctpChon?.id ?? "") === t.id ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted")
                }
              >
                {t.ten} <span className="ml-1 text-xs opacity-80">{t.so}</span>
              </Link>
            ))}
          </nav>
        )}
        {tieuDe(
          coXuat(
            <h3 className="text-sm font-semibold">
              Danh sách chính thức{ctpChon ? ` - ${ctpChon.ten.toLowerCase()}` : ""} ({dsChinhThucHienThi.length})
            </h3>,
            "chinh-thuc",
            ctpChon?.id,
          ),
          trangHocVien,
        )}
        {khongKhop(trangHocVien)}

        <KhungChonNhieu dsIdTrang={ids(trangHocVien.dsTrang)} dsIdTatCa={ids(trangHocVien.dsLoc)} hanhDong={hdDanhSach} donVi="học viên">
        <Table>
          <TableHeader>
            <TableRow>
              {oDau(hdDanhSach.length > 0)}
              <TableHead>Học viên</TableHead>
              <TableHead>CCCD/mã số</TableHead>
              <TableHead>Trạng thái</TableHead>
              {dsTp.map((t) => (
                <TableHead key={t.id}>Lệ phí {t.ten.toLowerCase()}</TableHead>
              ))}
              <TableHead>Chuyển khóa · thôi học · xóa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trangHocVien.dsTrang.map((dk) => (
              <TableRow key={dk.id}>
                {oDong(hdDanhSach.length > 0, dk.id, dk.hocVien.hoTen)}
                <TableCell>{dk.hocVien.hoTen}</TableCell>
                <TableCell>{dk.hocVien.soCCCD ?? "—"}</TableCell>
                <TableCell><NhanTrangThai ma={dk.trangThai}>{NHAN_TRANG_THAI_DANG_KY[dk.trangThai] ?? dk.trangThai}</NhanTrangThai></TableCell>
                {dsTp.map((t) => (
                  <TableCell key={t.id}>{oLePhiTp(lePhiTp.get(dk.hocVienId)?.thanhPhan.get(t.id))}</TableCell>
                ))}
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <FormChuyenKhoa khoaId={khoa.id} dangKyId={dk.id} dsKhoaKhac={dsKhoaKhacRutGon} />
                    {dk.trangThai !== "THOI_HOC" && (
                      <form action={ghiNhanThoiHocAction.bind(null, khoa.id, dk.id)}>
                        <Button type="submit" variant="secondary" className="h-7 px-2 text-xs">
                          Ghi nhận thôi học
                        </Button>
                      </form>
                    )}
                    <FormXoaHocVien khoaId={khoa.id} dangKyId={dk.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {dsChinhThucHienThi.length === 0 && (
              <TableRow>
                <TableCell colSpan={5 + dsTp.length} className="text-center text-sm text-muted-foreground">
                  Chưa có học viên nào trong danh sách chính thức
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </KhungChonNhieu>

        {thanhPhanTrang(trangHocVien)}

        {lichSuDanhSach.length > 0 && (
          <details className="text-sm" open={Boolean(trangLichSu.tuKhoa || thamSo.ls_trang)}>
            <summary className="cursor-pointer font-medium">Lịch sử thay đổi danh sách ({lichSuDanhSach.length})</summary>
            <div className="mt-2">{oTim(trangLichSu, "Nội dung / người thực hiện")}</div>
            {khongKhop(trangLichSu)}
            <ul className="mt-2 flex flex-col gap-1">
              {trangLichSu.dsTrang.map((ls) => (
                <li key={ls.id}>
                  <span className="text-muted-foreground">{ls.thoiGian.toLocaleString("vi-VN")}</span> ·{" "}
                  {NHAN_HANH_DONG_HV09[ls.hanhDong] ?? ls.hanhDong}: {ls.chiTiet} ·{" "}
                  <span className="text-muted-foreground">{ls.nguoiThucHienTen}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2">{thanhPhanTrang(trangLichSu)}</div>
          </details>
        )}
      </section>
    </main>
  );
}

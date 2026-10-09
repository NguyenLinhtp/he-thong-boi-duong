import type { TrangThaiDangKy, TrangThaiKhoa } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { khoaDaPheDuyetKetQua } from "@/server/services/kq/dung-chung";
import { xetDeNghiCapChungChi } from "@/server/services/cc/cc-01-de-nghi";
import type { KhoangNgay } from "@/server/services/bc/khoang-ngay";
import { nhanKy, khoangNgay } from "@/server/services/bc/khoang-ngay";
import {
  ExcelJS,
  themSheetBaoCao,
  sangBuffer,
  DINH_DANG_PHAN_TRAM,
  type CotBang,
} from "@/server/services/bc/excel";
import { nhanNganPhuongThuc } from "@/lib/phuong-thuc";

export const NHAN_TRANG_THAI_KHOA: Record<TrangThaiKhoa, string> = {
  CHUAN_BI: "Chuẩn bị mở",
  DANG_TUYEN_SINH: "Đang tuyển sinh",
  DANG_DIEN_RA: "Đang học",
  DA_KET_THUC: "Đã kết thúc",
  HUY: "Hủy",
};


/** Học viên được nhận vào khóa (tính sĩ số thực học), kể cả thôi học giữa chừng. */
const TRANG_THAI_DA_NHAN: TrangThaiDangKy[] = ["CHINH_THUC", "HOAN_THANH", "THOI_HOC"];

export type LocBaoCaoDaoTao = KhoangNgay & {
  dotTuyenSinhId?: string | null;
  loaiHinhBoiDuongId?: string | null;
  trangThai?: TrangThaiKhoa | null;
};

export type DongBaoCaoDaoTao = {
  khoaId: string;
  maKhoa: string;
  tenChuongTrinh: string;
  loaiHinh: string;
  phuongThuc: string;
  dot: string | null;
  khaiGiang: Date | null;
  beGiang: Date | null;
  trangThai: TrangThaiKhoa;
  siSoToiDa: number;
  soDangKy: number;
  soDaNhan: number;
  soThoiHoc: number;
  soDat: number;
  soHoanThanh: number | null;
  tyLeHoanThanh: number | null;
  soVanBangDaCap: number;
};

/**
 * Khóa thuộc kỳ báo cáo = thời gian học [khai giảng, bế giảng] giao với kỳ.
 * Khóa chưa có lịch dùng ngày tạo khóa thay cho mốc thiếu.
 */
function thuocKy(
  khoa: { thoiGianKhaiGiang: Date | null; thoiGianBeGiang: Date | null; createdAt: Date },
  { tu, den }: KhoangNgay,
) {
  const batDau = khoa.thoiGianKhaiGiang ?? khoa.createdAt;
  const ketThuc = khoa.thoiGianBeGiang ?? batDau;
  return (!den || batDau <= den) && (!tu || ketThuc >= tu);
}

/**
 * BC-02 (Cán bộ quản lý đào tạo): báo cáo định kỳ hoạt động đào tạo - số khóa,
 * số học viên, tỷ lệ hoàn thành theo kỳ, lọc theo đợt/loại hình/trạng thái.
 * "Hoàn thành" = học viên hoàn thành chương trình theo CC-01 (đạt kết quả đã
 * phê duyệt + hoàn tất nghĩa vụ tài chính, hoặc đã có văn bằng); khóa chưa
 * phê duyệt kết quả thì chưa tính (null). Tỷ lệ = hoàn thành / đã nhận vào khóa.
 */
export async function baoCaoHoatDongDaoTao(loc: LocBaoCaoDaoTao = {}) {
  const dsKhoa = (
    await prisma.khoa.findMany({
      where: {
        dotTuyenSinhId: loc.dotTuyenSinhId || undefined,
        trangThai: loc.trangThai || undefined,
        chuongTrinh: loc.loaiHinhBoiDuongId ? { loaiHinhBoiDuongId: loc.loaiHinhBoiDuongId } : undefined,
      },
      include: { chuongTrinh: { include: { loaiHinhBoiDuong: true } }, dotTuyenSinh: true },
      orderBy: [{ thoiGianKhaiGiang: "asc" }, { maKhoa: "asc" }],
    })
  ).filter((k) => thuocKy(k, loc));
  const khoaIds = dsKhoa.map((k) => k.id);

  const [nhomDangKy, dsDat, nhomVanBang] = await Promise.all([
    prisma.dangKyHoc.groupBy({ by: ["khoaId", "trangThai"], where: { khoaId: { in: khoaIds } }, _count: { _all: true } }),
    prisma.ketQuaKhoa.groupBy({
      by: ["khoaId"],
      where: { khoaId: { in: khoaIds }, daPheDuyet: true, datHocTap: true },
      _count: { _all: true },
    }),
    prisma.chungChi.groupBy({ by: ["khoaId"], where: { khoaId: { in: khoaIds }, trangThai: "DA_CAP" }, _count: { _all: true } }),
  ]);
  const demDangKy = (khoaId: string, loc?: TrangThaiDangKy[]) =>
    nhomDangKy
      .filter((n) => n.khoaId === khoaId && (!loc || loc.includes(n.trangThai)))
      .reduce((t, n) => t + n._count._all, 0);
  const datTheoKhoa = new Map(dsDat.map((n) => [n.khoaId, n._count._all]));
  const vanBangTheoKhoa = new Map(nhomVanBang.map((n) => [n.khoaId, n._count._all]));

  const dong: DongBaoCaoDaoTao[] = [];
  for (const k of dsKhoa) {
    const daNhan = demDangKy(k.id, TRANG_THAI_DA_NHAN);
    let hoanThanh: number | null = null;
    if (await khoaDaPheDuyetKetQua(k.id)) {
      const xet = await xetDeNghiCapChungChi(k.id);
      hoanThanh = xet.duDieuKien.length + xet.daCoChungChi.length;
    }
    dong.push({
      khoaId: k.id,
      maKhoa: k.maKhoa,
      tenChuongTrinh: k.chuongTrinh.ten,
      loaiHinh: k.chuongTrinh.loaiHinhBoiDuong.ten,
      phuongThuc: nhanNganPhuongThuc(k.chuongTrinh.phuongThucDangKys),
      dot: k.dotTuyenSinh?.ten ?? null,
      khaiGiang: k.thoiGianKhaiGiang,
      beGiang: k.thoiGianBeGiang,
      trangThai: k.trangThai,
      siSoToiDa: k.siSoToiDa,
      soDangKy: demDangKy(k.id),
      soDaNhan: daNhan,
      soThoiHoc: demDangKy(k.id, ["THOI_HOC"]),
      soDat: datTheoKhoa.get(k.id) ?? 0,
      soHoanThanh: hoanThanh,
      tyLeHoanThanh: hoanThanh === null || daNhan === 0 ? null : Math.round((hoanThanh / daNhan) * 1000) / 10,
      soVanBangDaCap: vanBangTheoKhoa.get(k.id) ?? 0,
    });
  }

  const cong = (ds: DongBaoCaoDaoTao[]) => {
    const coKetQua = ds.filter((d) => d.soHoanThanh !== null);
    const daNhanCoKetQua = coKetQua.reduce((t, d) => t + d.soDaNhan, 0);
    const hoanThanh = coKetQua.reduce((t, d) => t + (d.soHoanThanh ?? 0), 0);
    return {
      soKhoa: ds.length,
      soKhoaCoKetQua: coKetQua.length,
      soDangKy: ds.reduce((t, d) => t + d.soDangKy, 0),
      soDaNhan: ds.reduce((t, d) => t + d.soDaNhan, 0),
      soThoiHoc: ds.reduce((t, d) => t + d.soThoiHoc, 0),
      soDat: ds.reduce((t, d) => t + d.soDat, 0),
      soHoanThanh: hoanThanh,
      // tỷ lệ chỉ trên các khóa đã có kết quả phê duyệt
      tyLeHoanThanh: daNhanCoKetQua === 0 ? null : Math.round((hoanThanh / daNhanCoKetQua) * 1000) / 10,
      soVanBangDaCap: ds.reduce((t, d) => t + d.soVanBangDaCap, 0),
    };
  };

  const tenLoaiHinh = [...new Set(dong.map((d) => d.loaiHinh))].sort((a, b) => a.localeCompare(b, "vi"));
  const theoTrangThai = Object.fromEntries(
    (Object.keys(NHAN_TRANG_THAI_KHOA) as TrangThaiKhoa[]).map((tt) => [tt, dong.filter((d) => d.trangThai === tt).length]),
  ) as Record<TrangThaiKhoa, number>;

  return {
    dong,
    tong: cong(dong),
    theoTrangThai,
    theoLoaiHinh: tenLoaiHinh.map((ten) => ({ loaiHinh: ten, ...cong(dong.filter((d) => d.loaiHinh === ten)) })),
  };
}

const ngay = (d: Date | null) => (d ? d.toLocaleDateString("vi-VN") : "");

/** BC-02: xuất Excel theo mẫu - sheet tổng hợp theo loại hình và sheet chi tiết theo khóa. */
export async function xuatExcelBaoCaoDaoTao(loc: LocBaoCaoDaoTao, moTaLoc: string[] = []) {
  const bc = await baoCaoHoatDongDaoTao(loc);
  const moTa = [`Kỳ báo cáo: ${nhanKy(loc)}`, ...moTaLoc];
  const wb = new ExcelJS.Workbook();

  const cotTong: CotBang[] = [
    { tieuDe: "Loại hình bồi dưỡng", rong: 30 },
    { tieuDe: "Số khóa", rong: 10 },
    { tieuDe: "Hồ sơ đăng ký", rong: 12 },
    { tieuDe: "Học viên đã nhận", rong: 12 },
    { tieuDe: "Thôi học", rong: 10 },
    { tieuDe: "Đạt kết quả", rong: 12 },
    { tieuDe: "Hoàn thành", rong: 12 },
    { tieuDe: "Tỷ lệ hoàn thành (%)", rong: 14, dinhDang: DINH_DANG_PHAN_TRAM },
    { tieuDe: "Văn bằng đã cấp", rong: 12 },
  ];
  const hangTong = (ten: string, t: (typeof bc)["tong"]) => [
    ten,
    t.soKhoa,
    t.soDangKy,
    t.soDaNhan,
    t.soThoiHoc,
    t.soDat,
    t.soHoanThanh,
    t.tyLeHoanThanh,
    t.soVanBangDaCap,
  ];
  await themSheetBaoCao(wb, "Tổng hợp", {
    tieuDe: "BÁO CÁO HOẠT ĐỘNG ĐÀO TẠO, BỒI DƯỠNG",
    moTa: [...moTa, "Tỷ lệ hoàn thành tính trên các khóa đã phê duyệt kết quả (KQ-04)"],
    cot: cotTong,
    dong: bc.theoLoaiHinh.map((l) => hangTong(l.loaiHinh, l)),
    dongTong: hangTong("TỔNG CỘNG", bc.tong),
  });

  await themSheetBaoCao(wb, "Theo khóa", {
    tieuDe: "CHI TIẾT CÁC KHÓA BỒI DƯỠNG TRONG KỲ",
    moTa,
    cot: [
      { tieuDe: "STT", rong: 6 },
      { tieuDe: "Mã khóa", rong: 16 },
      { tieuDe: "Chương trình", rong: 34 },
      { tieuDe: "Loại hình", rong: 20 },
      { tieuDe: "Phương thức", rong: 10 },
      { tieuDe: "Đợt", rong: 16 },
      { tieuDe: "Khai giảng", rong: 12 },
      { tieuDe: "Bế giảng", rong: 12 },
      { tieuDe: "Trạng thái", rong: 14 },
      { tieuDe: "Sĩ số tối đa", rong: 10 },
      { tieuDe: "Hồ sơ đăng ký", rong: 10 },
      { tieuDe: "Đã nhận", rong: 10 },
      { tieuDe: "Thôi học", rong: 10 },
      { tieuDe: "Đạt", rong: 8 },
      { tieuDe: "Hoàn thành", rong: 10 },
      { tieuDe: "Tỷ lệ (%)", rong: 10, dinhDang: DINH_DANG_PHAN_TRAM },
      { tieuDe: "Văn bằng đã cấp", rong: 10 },
    ],
    dong: bc.dong.map((d, i) => [
      i + 1,
      d.maKhoa,
      d.tenChuongTrinh,
      d.loaiHinh,
      d.phuongThuc,
      d.dot ?? "",
      ngay(d.khaiGiang),
      ngay(d.beGiang),
      NHAN_TRANG_THAI_KHOA[d.trangThai],
      d.siSoToiDa,
      d.soDangKy,
      d.soDaNhan,
      d.soThoiHoc,
      d.soDat,
      d.soHoanThanh ?? "Chưa có KQ",
      d.tyLeHoanThanh,
      d.soVanBangDaCap,
    ]),
  });

  return { bc, noiDung: await sangBuffer(wb) };
}

export type ThamSoBaoCaoDaoTao = {
  tuNgay?: string | null;
  denNgay?: string | null;
  dot?: string | null;
  loaiHinh?: string | null;
  trangThai?: string | null;
};

/** Đọc bộ lọc từ query (trang/route tải Excel dùng chung) + mô tả bộ lọc để in lên báo cáo. */
export async function docLocBaoCaoDaoTao(thamSo: ThamSoBaoCaoDaoTao) {
  const trangThai =
    thamSo.trangThai && thamSo.trangThai in NHAN_TRANG_THAI_KHOA ? (thamSo.trangThai as TrangThaiKhoa) : null;
  const loc: LocBaoCaoDaoTao = {
    ...khoangNgay(thamSo.tuNgay, thamSo.denNgay),
    dotTuyenSinhId: thamSo.dot || null,
    loaiHinhBoiDuongId: thamSo.loaiHinh || null,
    trangThai,
  };
  const [dot, loaiHinh] = await Promise.all([
    loc.dotTuyenSinhId ? prisma.dotTuyenSinh.findUnique({ where: { id: loc.dotTuyenSinhId } }) : null,
    loc.loaiHinhBoiDuongId ? prisma.loaiHinhBoiDuong.findUnique({ where: { id: loc.loaiHinhBoiDuongId } }) : null,
  ]);
  const moTaLoc = [
    dot ? `Đợt: ${dot.ten}` : null,
    loaiHinh ? `Loại hình: ${loaiHinh.ten}` : null,
    trangThai ? `Trạng thái khóa: ${NHAN_TRANG_THAI_KHOA[trangThai]}` : null,
  ].filter((x): x is string => x !== null);
  return { loc, moTaLoc };
}

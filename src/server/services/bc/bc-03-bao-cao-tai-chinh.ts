import type { TrangThaiHocPhi } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { baoCaoDoanhThu, baoCaoCongNo } from "@/server/services/hp/hp-05-bao-cao";
import { khoangNgay, nhanKy, type KhoangNgay } from "@/server/services/bc/khoang-ngay";
import { ExcelJS, themSheetBaoCao, sangBuffer, DINH_DANG_TIEN } from "@/server/services/bc/excel";

// khoaIds: phạm vi khóa tùy ý (BC-04 dùng đúng các khóa thuộc kỳ của BC-02)
export type LocBaoCaoTaiChinh = KhoangNgay & { dotTuyenSinhId?: string | null; khoaId?: string | null; khoaIds?: string[] };

const CON_NO: TrangThaiHocPhi[] = ["CHUA_NOP", "CON_NO"];
const QUA_DVLK: TrangThaiHocPhi[] = ["CHO_THANH_LY_HOP_DONG", "DA_HOAN_TAT"];

/** Phạm vi khóa: 1 khóa, các khóa của 1 đợt, hoặc undefined = mọi khóa. */
async function phamViKhoa(loc: LocBaoCaoTaiChinh): Promise<string[] | undefined> {
  if (loc.khoaId) return [loc.khoaId];
  if (loc.khoaIds) return loc.khoaIds;
  if (loc.dotTuyenSinhId) {
    return (await prisma.khoa.findMany({ where: { dotTuyenSinhId: loc.dotTuyenSinhId }, select: { id: true } })).map(
      (k) => k.id,
    );
  }
  return undefined;
}

/**
 * BC-03 (Cán bộ tài chính/Lãnh đạo): báo cáo tài chính học phí phục vụ đối
 * soát. "Số liệu phải khớp module Quản lý học phí": doanh thu và công nợ lấy
 * thẳng từ HP-05 (doanh thu = tổng phiếu thu trong kỳ, công nợ = khoản Chưa
 * nộp/Còn nợ tại thời điểm lập báo cáo), kèm chi tiết để đối chiếu và 3 phép
 * kiểm tra khớp số liệu. Học viên qua đơn vị liên kết không nộp cá nhân (tiền
 * thu qua quyết toán hợp đồng - DVLK-06/07) nên chỉ đếm, không tính doanh thu.
 */
export async function baoCaoTaiChinhHocPhi(loc: LocBaoCaoTaiChinh = {}) {
  const khoaIds = await phamViKhoa(loc);
  const locKhoa = khoaIds ? { in: khoaIds } : undefined;

  const [doanhThu, congNo, dsPhieuThu, dsHocPhi, tongPhieuTheoHocPhi] = await Promise.all([
    baoCaoDoanhThu({ tuNgay: loc.tu, denNgay: loc.den, khoaIds }),
    baoCaoCongNo({ khoaIds }),
    prisma.phieuThu.findMany({
      where: { daHuy: false, ngayLap: { gte: loc.tu, lte: loc.den }, hocPhi: locKhoa ? { khoaId: locKhoa } : undefined },
      include: { hocPhi: { include: { hocVien: true, khoa: true } } },
      orderBy: [{ ngayLap: "asc" }, { soPhieu: "asc" }],
    }),
    prisma.hocPhi.findMany({
      where: { khoaId: locKhoa },
      include: { hocVien: true, khoa: { include: { chuongTrinh: true } } },
      orderBy: [{ khoa: { maKhoa: "asc" } }, { hocVien: { hoTen: "asc" } }],
    }),
    prisma.phieuThu.groupBy({
      by: ["hocPhiId"],
      where: { daHuy: false, hocPhi: locKhoa ? { khoaId: locKhoa } : undefined },
      _sum: { soTien: true },
    }),
  ]);

  // tình hình học phí lũy kế theo khóa + số thu trong kỳ (từ HP-05)
  const thuTrongKyTheoMaKhoa = new Map(doanhThu.theoKhoa.map((k) => [k.maKhoa, k]));
  const theoKhoa = new Map<
    string,
    {
      khoaId: string;
      maKhoa: string;
      tenChuongTrinh: string;
      mucHocPhi: number | null;
      soHocVien: number;
      phaiThu: number;
      daThuLuyKe: number;
      conNo: number;
      soConNo: number;
      soDaNopDu: number;
      soMienGiam: number;
      soQuaDvlk: number;
      thuTrongKy: number;
      soPhieuTrongKy: number;
    }
  >();
  for (const hp of dsHocPhi) {
    const k =
      theoKhoa.get(hp.khoaId) ??
      {
        khoaId: hp.khoaId,
        maKhoa: hp.khoa.maKhoa,
        tenChuongTrinh: hp.khoa.chuongTrinh.ten,
        mucHocPhi: hp.khoa.mucHocPhi == null ? null : Number(hp.khoa.mucHocPhi),
        soHocVien: 0,
        phaiThu: 0,
        daThuLuyKe: 0,
        conNo: 0,
        soConNo: 0,
        soDaNopDu: 0,
        soMienGiam: 0,
        soQuaDvlk: 0,
        thuTrongKy: thuTrongKyTheoMaKhoa.get(hp.khoa.maKhoa)?.soTien ?? 0,
        soPhieuTrongKy: thuTrongKyTheoMaKhoa.get(hp.khoa.maKhoa)?.soPhieu ?? 0,
      };
    k.soHocVien += 1;
    k.daThuLuyKe += Number(hp.soTienDaNop);
    if (hp.trangThai === "MIEN_GIAM") k.soMienGiam += 1;
    else if (QUA_DVLK.includes(hp.trangThai)) k.soQuaDvlk += 1;
    else {
      k.phaiThu += Number(hp.soTienPhaiNop);
      if (hp.trangThai === "DA_NOP_DU") k.soDaNopDu += 1;
    }
    if (CON_NO.includes(hp.trangThai)) {
      k.soConNo += 1;
      k.conNo += Number(hp.soTienPhaiNop) - Number(hp.soTienDaNop);
    }
    theoKhoa.set(hp.khoaId, k);
  }
  const dsTheoKhoa = [...theoKhoa.values()];
  const cong = (truong: "phaiThu" | "daThuLuyKe" | "conNo" | "thuTrongKy" | "soHocVien" | "soConNo" | "soMienGiam" | "soQuaDvlk" | "soDaNopDu" | "soPhieuTrongKy") =>
    dsTheoKhoa.reduce((t, k) => t + k[truong], 0);

  const dsCongNo = dsHocPhi
    .filter((hp) => CON_NO.includes(hp.trangThai))
    .map((hp) => ({
      maHocVien: hp.hocVien.maHocVien,
      hoTen: hp.hocVien.hoTen,
      maKhoa: hp.khoa.maKhoa,
      phaiNop: Number(hp.soTienPhaiNop),
      daNop: Number(hp.soTienDaNop),
      conNo: Number(hp.soTienPhaiNop) - Number(hp.soTienDaNop),
      hanNop: hp.hanNop,
    }));

  const theoHinhThuc = new Map<string, { soTien: number; soPhieu: number }>();
  for (const pt of dsPhieuThu) {
    const ten = pt.hinhThucNop?.trim() || "Không ghi";
    const h = theoHinhThuc.get(ten) ?? { soTien: 0, soPhieu: 0 };
    h.soTien += Number(pt.soTien);
    h.soPhieu += 1;
    theoHinhThuc.set(ten, h);
  }

  // đối soát
  const tongPhieuTheoId = new Map(tongPhieuTheoHocPhi.map((g) => [g.hocPhiId, Number(g._sum.soTien ?? 0)]));
  const lechHocPhi = dsHocPhi
    .map((hp) => ({
      maHocVien: hp.hocVien.maHocVien,
      hoTen: hp.hocVien.hoTen,
      maKhoa: hp.khoa.maKhoa,
      daNopGhiNhan: Number(hp.soTienDaNop),
      tongPhieuThu: tongPhieuTheoId.get(hp.id) ?? 0,
    }))
    .filter((x) => Math.abs(x.daNopGhiNhan - x.tongPhieuThu) > 0.005);
  const tongPhieuTrongKy = dsPhieuThu.reduce((t, pt) => t + Number(pt.soTien), 0);

  return {
    doanhThu: {
      tong: doanhThu.tongDoanhThu,
      soPhieuThu: doanhThu.soPhieuThu,
      theoHinhThuc: [...theoHinhThuc.entries()].map(([hinhThuc, v]) => ({ hinhThuc, ...v })),
    },
    congNo: { tong: congNo.tongConNo, soHocVien: congNo.soHocVienConNo, chiTiet: dsCongNo },
    theoKhoa: dsTheoKhoa,
    tongTheoKhoa: {
      soHocVien: cong("soHocVien"),
      phaiThu: cong("phaiThu"),
      daThuLuyKe: cong("daThuLuyKe"),
      conNo: cong("conNo"),
      soConNo: cong("soConNo"),
      soDaNopDu: cong("soDaNopDu"),
      soMienGiam: cong("soMienGiam"),
      soQuaDvlk: cong("soQuaDvlk"),
      thuTrongKy: cong("thuTrongKy"),
      soPhieuTrongKy: cong("soPhieuTrongKy"),
    },
    phieuThu: dsPhieuThu.map((pt) => ({
      soPhieu: pt.soPhieu,
      ngayLap: pt.ngayLap,
      maHocVien: pt.hocPhi.hocVien.maHocVien,
      hoTen: pt.hocPhi.hocVien.hoTen,
      maKhoa: pt.hocPhi.khoa.maKhoa,
      hinhThucNop: pt.hinhThucNop,
      soTien: Number(pt.soTien),
      nguoiLap: pt.nguoiLapTen,
    })),
    doiSoat: {
      doanhThuKhopPhieuThu: Math.abs(tongPhieuTrongKy - doanhThu.tongDoanhThu) < 0.005,
      congNoKhopTheoKhoa: Math.abs(cong("conNo") - congNo.tongConNo) < 0.005,
      lechHocPhi,
    },
  };
}

export type ThamSoBaoCaoTaiChinh = { tuNgay?: string | null; denNgay?: string | null; dot?: string | null; khoa?: string | null };

export async function docLocBaoCaoTaiChinh(thamSo: ThamSoBaoCaoTaiChinh) {
  const loc: LocBaoCaoTaiChinh = {
    ...khoangNgay(thamSo.tuNgay, thamSo.denNgay),
    dotTuyenSinhId: thamSo.dot || null,
    khoaId: thamSo.khoa || null,
  };
  const [dot, khoa] = await Promise.all([
    loc.dotTuyenSinhId ? prisma.dotTuyenSinh.findUnique({ where: { id: loc.dotTuyenSinhId } }) : null,
    loc.khoaId ? prisma.khoa.findUnique({ where: { id: loc.khoaId } }) : null,
  ]);
  const moTaLoc = [dot ? `Đợt: ${dot.ten}` : null, khoa ? `Khóa: ${khoa.maKhoa}` : null].filter(
    (x): x is string => x !== null,
  );
  return { loc, moTaLoc };
}

const ngay = (d: Date | null) => (d ? d.toLocaleDateString("vi-VN") : "");

/** BC-03: xuất Excel - tổng hợp theo khóa, phiếu thu trong kỳ, công nợ, đối soát. */
export async function xuatExcelBaoCaoTaiChinh(loc: LocBaoCaoTaiChinh, moTaLoc: string[] = []) {
  const bc = await baoCaoTaiChinhHocPhi(loc);
  const moTa = [`Kỳ báo cáo: ${nhanKy(loc)}`, ...moTaLoc];
  const wb = new ExcelJS.Workbook();
  const t = bc.tongTheoKhoa;

  await themSheetBaoCao(wb, "Tổng hợp", {
    tieuDe: "BÁO CÁO TÀI CHÍNH HỌC PHÍ",
    moTa: [
      ...moTa,
      `Doanh thu trong kỳ (tổng phiếu thu): ${bc.doanhThu.tong.toLocaleString("vi-VN")} đ - ${bc.doanhThu.soPhieuThu} phiếu`,
      `Công nợ tại thời điểm lập báo cáo: ${bc.congNo.tong.toLocaleString("vi-VN")} đ - ${bc.congNo.soHocVien} học viên`,
    ],
    cot: [
      { tieuDe: "Mã khóa", rong: 16 },
      { tieuDe: "Chương trình", rong: 32 },
      { tieuDe: "Mức học phí", rong: 14, dinhDang: DINH_DANG_TIEN },
      { tieuDe: "Số HV", rong: 8 },
      { tieuDe: "Phải thu", rong: 14, dinhDang: DINH_DANG_TIEN },
      { tieuDe: "Đã thu lũy kế", rong: 14, dinhDang: DINH_DANG_TIEN },
      { tieuDe: "Thu trong kỳ", rong: 14, dinhDang: DINH_DANG_TIEN },
      { tieuDe: "Còn nợ", rong: 14, dinhDang: DINH_DANG_TIEN },
      { tieuDe: "HV còn nợ", rong: 10 },
      { tieuDe: "HV nộp đủ", rong: 10 },
      { tieuDe: "Miễn giảm", rong: 10 },
      { tieuDe: "Qua ĐVLK", rong: 10 },
    ],
    dong: bc.theoKhoa.map((k) => [
      k.maKhoa,
      k.tenChuongTrinh,
      k.mucHocPhi,
      k.soHocVien,
      k.phaiThu,
      k.daThuLuyKe,
      k.thuTrongKy,
      k.conNo,
      k.soConNo,
      k.soDaNopDu,
      k.soMienGiam,
      k.soQuaDvlk,
    ]),
    dongTong: ["TỔNG CỘNG", "", null, t.soHocVien, t.phaiThu, t.daThuLuyKe, t.thuTrongKy, t.conNo, t.soConNo, t.soDaNopDu, t.soMienGiam, t.soQuaDvlk],
  });

  await themSheetBaoCao(wb, "Phiếu thu trong kỳ", {
    tieuDe: "BẢNG KÊ PHIẾU THU HỌC PHÍ",
    moTa,
    cot: [
      { tieuDe: "STT", rong: 6 },
      { tieuDe: "Số phiếu", rong: 14 },
      { tieuDe: "Ngày lập", rong: 12 },
      { tieuDe: "Mã học viên", rong: 16 },
      { tieuDe: "Họ tên", rong: 26 },
      { tieuDe: "Khóa", rong: 16 },
      { tieuDe: "Hình thức", rong: 14 },
      { tieuDe: "Số tiền", rong: 14, dinhDang: DINH_DANG_TIEN },
      { tieuDe: "Người lập", rong: 20 },
    ],
    dong: bc.phieuThu.map((pt, i) => [
      i + 1,
      pt.soPhieu,
      ngay(pt.ngayLap),
      pt.maHocVien,
      pt.hoTen,
      pt.maKhoa,
      pt.hinhThucNop ?? "",
      pt.soTien,
      pt.nguoiLap ?? "",
    ]),
    dongTong: ["", "TỔNG CỘNG", "", "", "", "", "", bc.doanhThu.tong, ""],
  });

  await themSheetBaoCao(wb, "Công nợ", {
    tieuDe: "DANH SÁCH HỌC VIÊN CÒN NỢ HỌC PHÍ",
    moTa: [`Tại thời điểm lập báo cáo ${new Date().toLocaleDateString("vi-VN")}`, ...moTaLoc],
    cot: [
      { tieuDe: "STT", rong: 6 },
      { tieuDe: "Mã học viên", rong: 16 },
      { tieuDe: "Họ tên", rong: 26 },
      { tieuDe: "Khóa", rong: 16 },
      { tieuDe: "Phải nộp", rong: 14, dinhDang: DINH_DANG_TIEN },
      { tieuDe: "Đã nộp", rong: 14, dinhDang: DINH_DANG_TIEN },
      { tieuDe: "Còn nợ", rong: 14, dinhDang: DINH_DANG_TIEN },
      { tieuDe: "Hạn nộp", rong: 12 },
    ],
    dong: bc.congNo.chiTiet.map((c, i) => [i + 1, c.maHocVien, c.hoTen, c.maKhoa, c.phaiNop, c.daNop, c.conNo, ngay(c.hanNop)]),
    dongTong: ["", "TỔNG CỘNG", "", "", null, null, bc.congNo.tong, ""],
  });

  const ds = bc.doiSoat;
  await themSheetBaoCao(wb, "Đối soát", {
    tieuDe: "KẾT QUẢ ĐỐI SOÁT VỚI MODULE QUẢN LÝ HỌC PHÍ",
    moTa: [
      `Doanh thu = tổng phiếu thu trong kỳ: ${ds.doanhThuKhopPhieuThu ? "KHỚP" : "LỆCH"}`,
      `Công nợ HP-05 = tổng công nợ theo khóa: ${ds.congNoKhopTheoKhoa ? "KHỚP" : "LỆCH"}`,
      `Số đã nộp ghi nhận = tổng phiếu thu từng khoản: ${ds.lechHocPhi.length === 0 ? "KHỚP" : `LỆCH ${ds.lechHocPhi.length} khoản (liệt kê dưới)`}`,
    ],
    cot: [
      { tieuDe: "Mã học viên", rong: 16 },
      { tieuDe: "Họ tên", rong: 26 },
      { tieuDe: "Khóa", rong: 16 },
      { tieuDe: "Đã nộp ghi nhận", rong: 16, dinhDang: DINH_DANG_TIEN },
      { tieuDe: "Tổng phiếu thu", rong: 16, dinhDang: DINH_DANG_TIEN },
      { tieuDe: "Chênh lệch", rong: 14, dinhDang: DINH_DANG_TIEN },
    ],
    dong: ds.lechHocPhi.map((x) => [x.maHocVien, x.hoTen, x.maKhoa, x.daNopGhiNhan, x.tongPhieuThu, x.daNopGhiNhan - x.tongPhieuThu]),
  });

  return { bc, noiDung: await sangBuffer(wb) };
}

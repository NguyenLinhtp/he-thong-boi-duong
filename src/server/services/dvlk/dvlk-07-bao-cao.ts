import { prisma } from "@/lib/db/prisma";
import { khoangNgay, nhanKy, type KhoangNgay } from "@/server/services/bc/khoang-ngay";
import { ExcelJS, themSheetBaoCao, sangBuffer, DINH_DANG_TIEN } from "@/server/services/bc/excel";
import { TRANG_THAI_KHONG_TINH } from "@/server/services/dvlk/dvlk-03-hop-dong";
import { TRANG_THAI_HOP_LE } from "@/server/services/dvlk/dvlk-06-thanh-ly";

export type LocBaoCaoDvlk = KhoangNgay & { donViLienKetId?: string | null; khoaId?: string | null };

/**
 * DVLK-07 (Cán bộ tài chính/Lãnh đạo): công nợ và doanh thu theo đơn vị liên
 * kết. "Số liệu khớp với các hợp đồng đã/chưa thanh lý":
 *  - Doanh thu = số tiền quyết toán ghi trên biên bản thanh lý (DVLK-06) của
 *    hợp đồng thanh lý trong kỳ.
 *  - Công nợ = hợp đồng CHƯA thanh lý tại thời điểm lập báo cáo; giá trị tạm
 *    tính = đơn giá thỏa thuận × số học viên hợp lệ hiện có (cùng công thức số
 *    tiền gợi ý khi thanh lý). Hợp đồng chưa có đơn giá: đếm riêng, không cộng.
 * Phạm vi hợp đồng: lập trước khi kết thúc kỳ và còn triển khai hoặc thanh lý
 * từ đầu kỳ trở đi. Không có học phí cá nhân học viên.
 */
export async function baoCaoDonViLienKet(loc: LocBaoCaoDvlk = {}) {
  const dsHopDong = await prisma.hopDongLienKet.findMany({
    where: {
      donViLienKetId: loc.donViLienKetId || undefined,
      khoaId: loc.khoaId || undefined,
      createdAt: loc.den ? { lte: loc.den } : undefined,
      OR: loc.tu ? [{ trangThai: "DANG_TRIEN_KHAI" }, { ngayQuyetToan: { gte: loc.tu } }] : undefined,
    },
    include: {
      donViLienKet: true,
      khoa: { include: { chuongTrinh: true } },
      dangKys: { select: { hocVienId: true, trangThai: true } },
    },
    orderBy: [{ donViLienKet: { ma: "asc" } }, { maHopDong: "asc" }],
  });

  // trạng thái tài chính của học viên thuộc các hợp đồng - để đối soát
  const dsHocPhi = await prisma.hocPhi.findMany({
    where: {
      OR: dsHopDong.map((hd) => ({ khoaId: hd.khoaId, hocVienId: { in: hd.dangKys.map((dk) => dk.hocVienId) } })),
    },
    select: { hocVienId: true, khoaId: true, trangThai: true },
  });
  const hocPhiTheo = new Map(dsHocPhi.map((hp) => [`${hp.hocVienId}|${hp.khoaId}`, hp.trangThai]));

  const trongKy = (d: Date | null) => d !== null && (!loc.tu || d >= loc.tu) && (!loc.den || d <= loc.den);

  const chiTiet = dsHopDong.map((hd) => {
    const thucTe = hd.dangKys.filter((dk) => !TRANG_THAI_KHONG_TINH.includes(dk.trangThai));
    const hopLe = hd.dangKys.filter((dk) => TRANG_THAI_HOP_LE.includes(dk.trangThai));
    const daThanhLy = hd.trangThai === "DA_THANH_LY";
    const donGia = hd.donGiaThoaThuan == null ? null : Number(hd.donGiaThoaThuan);
    const soTienQuyetToan = hd.soTienQuyetToan == null ? null : Number(hd.soTienQuyetToan);
    const trangThaiTaiChinh = hopLe.map((dk) => hocPhiTheo.get(`${dk.hocVienId}|${hd.khoaId}`));
    return {
      hopDongId: hd.id,
      maHopDong: hd.maHopDong,
      donViLienKetId: hd.donViLienKetId,
      maDonVi: hd.donViLienKet.ma,
      tenDonVi: hd.donViLienKet.ten,
      khoaId: hd.khoaId,
      maKhoa: hd.khoa.maKhoa,
      tenChuongTrinh: hd.khoa.chuongTrinh.ten,
      daThanhLy,
      soBienBan: hd.soBienBanThanhLy,
      ngayThanhLy: hd.ngayQuyetToan,
      donGia,
      soDuKien: hd.soLuongDuKien,
      soThucTe: thucTe.length,
      soHopLe: hopLe.length,
      // số liệu chốt trên biên bản (chỉ có khi đã thanh lý)
      soChotBienBan: hd.soLuongThucTe,
      soHoanThanh: hd.soHocVienHoanThanh,
      soThoiHoc: daThanhLy ? hd.soHocVienThoiHoc : hopLe.filter((dk) => dk.trangThai === "THOI_HOC").length,
      doanhThu: daThanhLy && trongKy(hd.ngayQuyetToan) ? (soTienQuyetToan ?? 0) : 0,
      soTienQuyetToan,
      congNoTamTinh: daThanhLy || donGia === null ? 0 : donGia * hopLe.length,
      chuaCoDonGia: !daThanhLy && donGia === null,
      // đối soát trạng thái tài chính với trạng thái hợp đồng
      soChuaHoanTat: daThanhLy ? trangThaiTaiChinh.filter((tt) => tt !== "DA_HOAN_TAT").length : 0,
      soHoanTatSom: daThanhLy ? 0 : trangThaiTaiChinh.filter((tt) => tt === "DA_HOAN_TAT").length,
    };
  });

  type TongHop = {
    soHopDong: number;
    soDaThanhLy: number;
    soChuaThanhLy: number;
    soDuKien: number;
    soThucTe: number;
    soHopLe: number;
    doanhThu: number;
    soThanhLyTrongKy: number;
    congNoTamTinh: number;
    soChuaCoDonGia: number;
  };
  const rong = (): TongHop => ({
    soHopDong: 0,
    soDaThanhLy: 0,
    soChuaThanhLy: 0,
    soDuKien: 0,
    soThucTe: 0,
    soHopLe: 0,
    doanhThu: 0,
    soThanhLyTrongKy: 0,
    congNoTamTinh: 0,
    soChuaCoDonGia: 0,
  });
  const cong = (t: TongHop, c: (typeof chiTiet)[number]) => {
    t.soHopDong += 1;
    if (c.daThanhLy) t.soDaThanhLy += 1;
    else t.soChuaThanhLy += 1;
    t.soDuKien += c.soDuKien ?? 0;
    t.soThucTe += c.soThucTe;
    t.soHopLe += c.soHopLe;
    t.doanhThu += c.doanhThu;
    if (c.daThanhLy && trongKy(c.ngayThanhLy)) t.soThanhLyTrongKy += 1;
    t.congNoTamTinh += c.congNoTamTinh;
    if (c.chuaCoDonGia) t.soChuaCoDonGia += 1;
  };

  const theoDonVi = new Map<string, TongHop & { donViLienKetId: string; maDonVi: string; tenDonVi: string }>();
  const tong = rong();
  for (const c of chiTiet) {
    const dv = theoDonVi.get(c.donViLienKetId) ?? {
      ...rong(),
      donViLienKetId: c.donViLienKetId,
      maDonVi: c.maDonVi,
      tenDonVi: c.tenDonVi,
    };
    cong(dv, c);
    cong(tong, c);
    theoDonVi.set(c.donViLienKetId, dv);
  }

  // đối soát độc lập với tổng các hợp đồng trong CSDL
  const [aggDoanhThu, soChuaThanhLyCsdl] = await Promise.all([
    prisma.hopDongLienKet.aggregate({
      where: {
        trangThai: "DA_THANH_LY",
        donViLienKetId: loc.donViLienKetId || undefined,
        khoaId: loc.khoaId || undefined,
        createdAt: loc.den ? { lte: loc.den } : undefined,
        ngayQuyetToan: { gte: loc.tu, lte: loc.den },
      },
      _sum: { soTienQuyetToan: true },
    }),
    prisma.hopDongLienKet.count({
      where: {
        trangThai: "DANG_TRIEN_KHAI",
        donViLienKetId: loc.donViLienKetId || undefined,
        khoaId: loc.khoaId || undefined,
        createdAt: loc.den ? { lte: loc.den } : undefined,
      },
    }),
  ]);
  const doanhThuHopDong = Number(aggDoanhThu._sum.soTienQuyetToan ?? 0);

  return {
    theoDonVi: [...theoDonVi.values()],
    chiTiet,
    tong,
    doiSoat: {
      doanhThuHopDong,
      doanhThuKhop: Math.abs(doanhThuHopDong - tong.doanhThu) < 0.005,
      soChuaThanhLyKhop: soChuaThanhLyCsdl === tong.soChuaThanhLy,
      // đã thanh lý: số hợp lệ hiện tại phải bằng số chốt trên biên bản và mọi
      // học viên hợp lệ ở trạng thái "Đã hoàn tất"; chưa thanh lý: chưa ai hoàn tất
      lech: chiTiet
        .map((c) => {
          const lyDo: string[] = [];
          if (c.daThanhLy && c.soChotBienBan !== null && c.soChotBienBan !== c.soHopLe) {
            lyDo.push(`số học viên hợp lệ hiện tại ${c.soHopLe} khác số chốt trên biên bản ${c.soChotBienBan}`);
          }
          if (c.soChuaHoanTat > 0) lyDo.push(`${c.soChuaHoanTat} học viên hợp lệ chưa ở trạng thái tài chính "Đã hoàn tất"`);
          if (c.soHoanTatSom > 0) lyDo.push(`${c.soHoanTatSom} học viên đã "Đã hoàn tất" dù hợp đồng chưa thanh lý`);
          return { maHopDong: c.maHopDong, tenDonVi: c.tenDonVi, lyDo };
        })
        .filter((x) => x.lyDo.length > 0),
    },
  };
}

export type ThamSoBaoCaoDvlk = { tuNgay?: string | null; denNgay?: string | null; donVi?: string | null; khoa?: string | null };

export async function docLocBaoCaoDvlk(thamSo: ThamSoBaoCaoDvlk) {
  const loc: LocBaoCaoDvlk = {
    ...khoangNgay(thamSo.tuNgay, thamSo.denNgay),
    donViLienKetId: thamSo.donVi || null,
    khoaId: thamSo.khoa || null,
  };
  const [donVi, khoa] = await Promise.all([
    loc.donViLienKetId ? prisma.donViLienKet.findUnique({ where: { id: loc.donViLienKetId } }) : null,
    loc.khoaId ? prisma.khoa.findUnique({ where: { id: loc.khoaId } }) : null,
  ]);
  const moTaLoc = [donVi ? `Đơn vị liên kết: ${donVi.ma} - ${donVi.ten}` : null, khoa ? `Khóa: ${khoa.maKhoa}` : null].filter(
    (x): x is string => x !== null,
  );
  return { loc, moTaLoc };
}

/** Bộ lọc: đơn vị liên kết và khóa đã từng có hợp đồng liên kết. */
export async function tuyChonBaoCaoDvlk() {
  const [dsDonVi, dsKhoa] = await Promise.all([
    prisma.donViLienKet.findMany({ where: { hopDongs: { some: {} } }, orderBy: { ma: "asc" } }),
    prisma.khoa.findMany({
      where: { hopDongs: { some: {} } },
      include: { chuongTrinh: true },
      orderBy: { maKhoa: "asc" },
    }),
  ]);
  return { dsDonVi, dsKhoa };
}

const ngay = (d: Date | null) => (d ? d.toLocaleDateString("vi-VN") : "");

/** DVLK-07: xuất Excel - tổng hợp theo đơn vị, chi tiết hợp đồng, đối soát. */
export async function xuatExcelBaoCaoDvlk(loc: LocBaoCaoDvlk, moTaLoc: string[] = []) {
  const bc = await baoCaoDonViLienKet(loc);
  const moTa = [`Kỳ báo cáo: ${nhanKy(loc)}`, ...moTaLoc];
  const wb = new ExcelJS.Workbook();
  const t = bc.tong;

  await themSheetBaoCao(wb, "Theo đơn vị", {
    tieuDe: "BÁO CÁO CÔNG NỢ VÀ DOANH THU THEO ĐƠN VỊ LIÊN KẾT",
    moTa: [
      ...moTa,
      "Doanh thu = số tiền quyết toán của hợp đồng thanh lý trong kỳ; công nợ = hợp đồng chưa thanh lý tại thời điểm lập báo cáo (đơn giá × học viên hợp lệ)",
    ],
    cot: [
      { tieuDe: "Mã đơn vị", rong: 14 },
      { tieuDe: "Tên đơn vị", rong: 32 },
      { tieuDe: "Số HĐ", rong: 8 },
      { tieuDe: "Đã thanh lý", rong: 10 },
      { tieuDe: "Chưa thanh lý", rong: 10 },
      { tieuDe: "HV dự kiến", rong: 10 },
      { tieuDe: "HV thực tế", rong: 10 },
      { tieuDe: "HV hợp lệ", rong: 10 },
      { tieuDe: "Doanh thu trong kỳ", rong: 16, dinhDang: DINH_DANG_TIEN },
      { tieuDe: "Công nợ tạm tính", rong: 16, dinhDang: DINH_DANG_TIEN },
      { tieuDe: "HĐ chưa có đơn giá", rong: 12 },
    ],
    dong: bc.theoDonVi.map((d) => [
      d.maDonVi,
      d.tenDonVi,
      d.soHopDong,
      d.soDaThanhLy,
      d.soChuaThanhLy,
      d.soDuKien,
      d.soThucTe,
      d.soHopLe,
      d.doanhThu,
      d.congNoTamTinh,
      d.soChuaCoDonGia,
    ]),
    dongTong: ["TỔNG CỘNG", "", t.soHopDong, t.soDaThanhLy, t.soChuaThanhLy, t.soDuKien, t.soThucTe, t.soHopLe, t.doanhThu, t.congNoTamTinh, t.soChuaCoDonGia],
  });

  await themSheetBaoCao(wb, "Chi tiết hợp đồng", {
    tieuDe: "CHI TIẾT HỢP ĐỒNG LIÊN KẾT TUYỂN SINH",
    moTa,
    cot: [
      { tieuDe: "Mã hợp đồng", rong: 20 },
      { tieuDe: "Đơn vị", rong: 26 },
      { tieuDe: "Khóa", rong: 16 },
      { tieuDe: "Trạng thái", rong: 14 },
      { tieuDe: "Đơn giá", rong: 14, dinhDang: DINH_DANG_TIEN },
      { tieuDe: "Dự kiến", rong: 9 },
      { tieuDe: "Thực tế", rong: 9 },
      { tieuDe: "Hợp lệ", rong: 9 },
      { tieuDe: "Hoàn thành", rong: 10 },
      { tieuDe: "Thôi học", rong: 9 },
      { tieuDe: "Biên bản", rong: 22 },
      { tieuDe: "Ngày thanh lý", rong: 12 },
      { tieuDe: "Quyết toán", rong: 14, dinhDang: DINH_DANG_TIEN },
      { tieuDe: "Doanh thu trong kỳ", rong: 16, dinhDang: DINH_DANG_TIEN },
      { tieuDe: "Công nợ tạm tính", rong: 16, dinhDang: DINH_DANG_TIEN },
    ],
    dong: bc.chiTiet.map((c) => [
      c.maHopDong,
      c.tenDonVi,
      c.maKhoa,
      c.daThanhLy ? "Đã thanh lý" : "Chưa thanh lý",
      c.donGia,
      c.soDuKien,
      c.soThucTe,
      c.soHopLe,
      c.soHoanThanh,
      c.soThoiHoc,
      c.soBienBan ?? "",
      ngay(c.ngayThanhLy),
      c.soTienQuyetToan,
      c.doanhThu,
      c.chuaCoDonGia ? null : c.congNoTamTinh,
    ]),
    dongTong: ["TỔNG CỘNG", "", "", "", null, t.soDuKien, t.soThucTe, t.soHopLe, null, null, "", "", null, t.doanhThu, t.congNoTamTinh],
  });

  const ds = bc.doiSoat;
  await themSheetBaoCao(wb, "Đối soát", {
    tieuDe: "ĐỐI SOÁT VỚI CÁC HỢP ĐỒNG ĐÃ/CHƯA THANH LÝ",
    moTa: [
      `Doanh thu = tổng quyết toán hợp đồng thanh lý trong kỳ (${ds.doanhThuHopDong.toLocaleString("vi-VN")} đ): ${ds.doanhThuKhop ? "KHỚP" : "LỆCH"}`,
      `Số hợp đồng chưa thanh lý: ${ds.soChuaThanhLyKhop ? "KHỚP" : "LỆCH"}`,
      `Trạng thái tài chính học viên theo hợp đồng: ${ds.lech.length === 0 ? "KHỚP" : `LỆCH ${ds.lech.length} hợp đồng (liệt kê dưới)`}`,
    ],
    cot: [
      { tieuDe: "Mã hợp đồng", rong: 20 },
      { tieuDe: "Đơn vị", rong: 26 },
      { tieuDe: "Nội dung lệch", rong: 80 },
    ],
    dong: ds.lech.map((x) => [x.maHopDong, x.tenDonVi, x.lyDo.join("; ")]),
  });

  return { bc, noiDung: await sangBuffer(wb) };
}

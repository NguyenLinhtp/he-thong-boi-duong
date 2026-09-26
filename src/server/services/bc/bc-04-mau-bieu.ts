import type { NhomBaoCao, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ghiNhatKy } from "@/server/services/qt/qt-03-nhat-ky";
import type { NguoiThucHien } from "@/server/services/dvlk/dvlk-01-danh-muc";
import { baoCaoHoatDongDaoTao } from "@/server/services/bc/bc-02-bao-cao-dao-tao";
import { baoCaoTaiChinhHocPhi } from "@/server/services/bc/bc-03-bao-cao-tai-chinh";
import { nhanKy, type KhoangNgay } from "@/server/services/bc/khoang-ngay";
import { ExcelJS, themSheetBaoCao, sangBuffer, DINH_DANG_TIEN, DINH_DANG_PHAN_TRAM } from "@/server/services/bc/excel";
import { MauBieuKhongHopLeError, KhongTimThayMauBieuError } from "@/server/services/bc/loi-bao-cao";

type KieuChiTieu = "so" | "tien" | "phanTram";

/**
 * Danh mục chỉ tiêu dùng để dựng cột mẫu biểu - số liệu lấy từ BC-02 (đào
 * tạo) và BC-03 (tài chính học phí) nên khớp các báo cáo đó. Thêm chỉ tiêu mới
 * ở đây khi quy định yêu cầu số liệu chưa có.
 */
export const CHI_TIEU = {
  soKhoa: { nhan: "Số khóa bồi dưỡng", kieu: "so", nguon: "DAO_TAO" },
  siSoToiDa: { nhan: "Chỉ tiêu tuyển sinh (sĩ số tối đa)", kieu: "so", nguon: "DAO_TAO" },
  soDangKy: { nhan: "Số hồ sơ đăng ký", kieu: "so", nguon: "DAO_TAO" },
  soDaNhan: { nhan: "Số học viên tham gia", kieu: "so", nguon: "DAO_TAO" },
  soThoiHoc: { nhan: "Số học viên thôi học", kieu: "so", nguon: "DAO_TAO" },
  soDat: { nhan: "Số học viên đạt kết quả", kieu: "so", nguon: "DAO_TAO" },
  soHoanThanh: { nhan: "Số học viên hoàn thành", kieu: "so", nguon: "DAO_TAO" },
  tyLeHoanThanh: { nhan: "Tỷ lệ hoàn thành (%)", kieu: "phanTram", nguon: "DAO_TAO" },
  soVanBangDaCap: { nhan: "Số văn bằng đã cấp", kieu: "so", nguon: "DAO_TAO" },
  phaiThu: { nhan: "Học phí phải thu", kieu: "tien", nguon: "TAI_CHINH" },
  thuTrongKy: { nhan: "Học phí đã thu trong kỳ", kieu: "tien", nguon: "TAI_CHINH" },
  daThuLuyKe: { nhan: "Học phí đã thu lũy kế", kieu: "tien", nguon: "TAI_CHINH" },
  conNo: { nhan: "Học phí còn nợ", kieu: "tien", nguon: "TAI_CHINH" },
  soMienGiam: { nhan: "Số học viên miễn giảm", kieu: "so", nguon: "TAI_CHINH" },
} as const satisfies Record<string, { nhan: string; kieu: KieuChiTieu; nguon: "DAO_TAO" | "TAI_CHINH" }>;

export type MaChiTieu = keyof typeof CHI_TIEU;
export type CotMauBieu = { chiTieu: MaChiTieu; tieuDe: string };

export const NHAN_NHOM: Record<NhomBaoCao, string> = {
  TONG: "Toàn đơn vị (1 dòng)",
  LOAI_HINH: "Theo loại hình bồi dưỡng",
  CHUONG_TRINH: "Theo chương trình",
  KHOA: "Theo khóa",
};

export type MauBieuInput = {
  ma: string;
  ten: string;
  coQuanNhan?: string | null;
  canCu?: string | null;
  nhomTheo: NhomBaoCao;
  cot: { chiTieu: string; tieuDe?: string | null }[];
};

function chuanHoaMau(input: MauBieuInput) {
  const ma = input.ma?.trim().toUpperCase();
  const ten = input.ten?.trim();
  if (!ma) throw new MauBieuKhongHopLeError("thiếu số hiệu biểu");
  if (!ten) throw new MauBieuKhongHopLeError("thiếu tên biểu");
  if (!(input.nhomTheo in NHAN_NHOM)) throw new MauBieuKhongHopLeError("cách nhóm dòng không hợp lệ");
  if (!input.cot?.length) throw new MauBieuKhongHopLeError("chọn ít nhất 1 chỉ tiêu");
  const cot: CotMauBieu[] = input.cot.map((c) => {
    if (!(c.chiTieu in CHI_TIEU)) throw new MauBieuKhongHopLeError(`chỉ tiêu "${c.chiTieu}" không có trong danh mục`);
    const chiTieu = c.chiTieu as MaChiTieu;
    return { chiTieu, tieuDe: c.tieuDe?.trim() || CHI_TIEU[chiTieu].nhan };
  });
  if (new Set(cot.map((c) => c.chiTieu)).size !== cot.length) throw new MauBieuKhongHopLeError("chỉ tiêu bị trùng");
  return {
    ma,
    ten,
    coQuanNhan: input.coQuanNhan?.trim() || null,
    canCu: input.canCu?.trim() || null,
    nhomTheo: input.nhomTheo,
    cot: cot as unknown as Prisma.InputJsonValue,
  };
}

/** BC-04: tạo mẫu biểu mới (phiên bản 1). */
export async function taoMauBieu(input: MauBieuInput, nguoi: NguoiThucHien) {
  const data = chuanHoaMau(input);
  if (await prisma.mauBieuBaoCao.findFirst({ where: { ma: data.ma } })) {
    throw new MauBieuKhongHopLeError(`biểu ${data.ma} đã có - dùng "cập nhật" để tạo phiên bản mới`);
  }
  const mau = await prisma.mauBieuBaoCao.create({ data: { ...data, phienBan: 1, nguoiCapNhat: nguoi.nguoiThucHienTen } });
  await ghiNhatKy({ ...nguoi, hanhDong: "TAO_MAU_BIEU_BAO_CAO", doiTuong: "MauBieuBaoCao", doiTuongId: mau.id, chiTiet: `${mau.ma} v1: ${mau.ten}` });
  return mau;
}

/**
 * BC-04 "cập nhật mẫu biểu khi có thay đổi quy định": tạo phiên bản mới áp
 * dụng từ nay, phiên bản đang áp dụng chuyển thành lịch sử (không sửa đè).
 */
export async function capNhatMauBieu(ma: string, input: Omit<MauBieuInput, "ma">, nguoi: NguoiThucHien) {
  const data = chuanHoaMau({ ...input, ma });
  const cuoi = await prisma.mauBieuBaoCao.findFirst({ where: { ma: data.ma }, orderBy: { phienBan: "desc" } });
  if (!cuoi) throw new KhongTimThayMauBieuError();
  const mau = await prisma.$transaction(async (tx) => {
    await tx.mauBieuBaoCao.updateMany({ where: { ma: data.ma, dangApDung: true }, data: { dangApDung: false } });
    return tx.mauBieuBaoCao.create({ data: { ...data, phienBan: cuoi.phienBan + 1, nguoiCapNhat: nguoi.nguoiThucHienTen } });
  });
  await ghiNhatKy({
    ...nguoi,
    hanhDong: "CAP_NHAT_MAU_BIEU_BAO_CAO",
    doiTuong: "MauBieuBaoCao",
    doiTuongId: mau.id,
    chiTiet: `${mau.ma} v${cuoi.phienBan} -> v${mau.phienBan}: ${mau.ten}`,
  });
  return mau;
}

/** BC-04: ngừng áp dụng 1 biểu (quy định bãi bỏ) - các phiên bản vẫn lưu để xuất lại kỳ cũ. */
export async function ngungApDungMauBieu(ma: string, nguoi: NguoiThucHien) {
  const { count } = await prisma.mauBieuBaoCao.updateMany({ where: { ma, dangApDung: true }, data: { dangApDung: false } });
  if (count === 0) throw new KhongTimThayMauBieuError();
  await ghiNhatKy({ ...nguoi, hanhDong: "NGUNG_MAU_BIEU_BAO_CAO", doiTuong: "MauBieuBaoCao", doiTuongId: ma, chiTiet: ma });
}

/** Mọi phiên bản, mới nhất trước - trang quản lý nhóm theo số hiệu biểu. */
export async function danhSachMauBieu() {
  return prisma.mauBieuBaoCao.findMany({ orderBy: [{ ma: "asc" }, { phienBan: "desc" }] });
}

/** Mẫu gợi ý ban đầu - cần chỉnh theo đúng biểu mẫu hiện hành của Bộ/Sở trước khi dùng chính thức. */
export const MAU_MAC_DINH: MauBieuInput[] = [
  {
    ma: "BIEU-01",
    ten: "BÁO CÁO KẾT QUẢ BỒI DƯỠNG",
    coQuanNhan: "Bộ Giáo dục và Đào tạo",
    nhomTheo: "LOAI_HINH",
    cot: [
      { chiTieu: "soKhoa" },
      { chiTieu: "soDaNhan" },
      { chiTieu: "soHoanThanh" },
      { chiTieu: "tyLeHoanThanh" },
      { chiTieu: "soVanBangDaCap" },
    ],
  },
  {
    ma: "BIEU-02",
    ten: "BÁO CÁO THU HỌC PHÍ BỒI DƯỠNG",
    coQuanNhan: "Bộ Giáo dục và Đào tạo",
    nhomTheo: "KHOA",
    cot: [{ chiTieu: "soDaNhan" }, { chiTieu: "phaiThu" }, { chiTieu: "thuTrongKy" }, { chiTieu: "conNo" }],
  },
];

export async function taoMauMacDinh(nguoi: NguoiThucHien) {
  const daCo = new Set((await prisma.mauBieuBaoCao.findMany({ select: { ma: true } })).map((m) => m.ma));
  const dsTao = [];
  for (const m of MAU_MAC_DINH) if (!daCo.has(m.ma)) dsTao.push(await taoMauBieu(m, nguoi));
  return dsTao;
}

export type LocBaoCaoTheoMau = KhoangNgay & { dotTuyenSinhId?: string | null };

/**
 * BC-04: lập số liệu theo 1 phiên bản mẫu biểu cho 1 kỳ. Khóa thuộc kỳ theo
 * BC-02; chỉ tiêu tài chính lấy từ BC-03 trên đúng các khóa đó. Dòng nhóm theo
 * cấu hình của mẫu; tỷ lệ hoàn thành tính lại trên nhóm (khóa đã có kết quả).
 */
export async function lapBaoCaoTheoMau(mauId: string, loc: LocBaoCaoTheoMau) {
  const mau = await prisma.mauBieuBaoCao.findUnique({ where: { id: mauId } });
  if (!mau) throw new KhongTimThayMauBieuError();
  const cot = mau.cot as unknown as CotMauBieu[];

  const daoTao = await baoCaoHoatDongDaoTao({ tu: loc.tu, den: loc.den, dotTuyenSinhId: loc.dotTuyenSinhId });
  const canTaiChinh = cot.some((c) => CHI_TIEU[c.chiTieu].nguon === "TAI_CHINH");
  const taiChinh = canTaiChinh
    ? await baoCaoTaiChinhHocPhi({ tu: loc.tu, den: loc.den, khoaIds: daoTao.dong.map((d) => d.khoaId) })
    : null;
  const tcTheoKhoa = new Map((taiChinh?.theoKhoa ?? []).map((k) => [k.khoaId, k]));

  const khoaNhom = (d: (typeof daoTao.dong)[number]) =>
    mau.nhomTheo === "TONG"
      ? "Toàn đơn vị"
      : mau.nhomTheo === "LOAI_HINH"
        ? d.loaiHinh
        : mau.nhomTheo === "CHUONG_TRINH"
          ? d.tenChuongTrinh
          : `${d.maKhoa} - ${d.tenChuongTrinh}`;

  type TichLuy = Record<Exclude<MaChiTieu, "tyLeHoanThanh">, number> & { daNhanCoKetQua: number };
  const moi = (): TichLuy => ({
    soKhoa: 0, siSoToiDa: 0, soDangKy: 0, soDaNhan: 0, soThoiHoc: 0, soDat: 0, soHoanThanh: 0, soVanBangDaCap: 0,
    phaiThu: 0, thuTrongKy: 0, daThuLuyKe: 0, conNo: 0, soMienGiam: 0, daNhanCoKetQua: 0,
  });
  const cong = (t: TichLuy, d: (typeof daoTao.dong)[number]) => {
    const tc = tcTheoKhoa.get(d.khoaId);
    t.soKhoa += 1;
    t.siSoToiDa += d.siSoToiDa;
    t.soDangKy += d.soDangKy;
    t.soDaNhan += d.soDaNhan;
    t.soThoiHoc += d.soThoiHoc;
    t.soDat += d.soDat;
    t.soVanBangDaCap += d.soVanBangDaCap;
    if (d.soHoanThanh !== null) {
      t.soHoanThanh += d.soHoanThanh;
      t.daNhanCoKetQua += d.soDaNhan;
    }
    t.phaiThu += tc?.phaiThu ?? 0;
    t.thuTrongKy += tc?.thuTrongKy ?? 0;
    t.daThuLuyKe += tc?.daThuLuyKe ?? 0;
    t.conNo += tc?.conNo ?? 0;
    t.soMienGiam += tc?.soMienGiam ?? 0;
  };
  const giaTriCot = (t: TichLuy) =>
    cot.map((c) =>
      c.chiTieu === "tyLeHoanThanh"
        ? t.daNhanCoKetQua === 0
          ? null
          : Math.round((t.soHoanThanh / t.daNhanCoKetQua) * 1000) / 10
        : t[c.chiTieu],
    );

  const nhom = new Map<string, TichLuy>();
  const tong = moi();
  for (const d of daoTao.dong) {
    const k = khoaNhom(d);
    if (!nhom.has(k)) nhom.set(k, moi());
    cong(nhom.get(k)!, d);
    cong(tong, d);
  }
  const dong = [...nhom.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "vi"))
    .map(([ten, t]) => ({ nhom: ten, giaTri: giaTriCot(t) }));

  return { mau, cot, dong, tong: giaTriCot(tong) };
}

/** BC-04: xuất file Excel đúng mẫu biểu - đầu biểu, kỳ báo cáo, bảng số liệu, phần ký. */
export async function xuatExcelTheoMau(mauId: string, loc: LocBaoCaoTheoMau, moTaLoc: string[], nguoi: NguoiThucHien) {
  const { mau, cot, dong, tong } = await lapBaoCaoTheoMau(mauId, loc);
  const wb = new ExcelJS.Workbook();
  const dinhDang = (c: CotMauBieu) =>
    CHI_TIEU[c.chiTieu].kieu === "tien" ? DINH_DANG_TIEN : CHI_TIEU[c.chiTieu].kieu === "phanTram" ? DINH_DANG_PHAN_TRAM : undefined;
  const ws = await themSheetBaoCao(wb, mau.ma, {
    tieuDe: mau.ten.toUpperCase(),
    moTa: [
      `Biểu số: ${mau.ma} (phiên bản ${mau.phienBan})`,
      ...(mau.coQuanNhan ? [`Kính gửi: ${mau.coQuanNhan}`] : []),
      ...(mau.canCu ? [`Căn cứ: ${mau.canCu}`] : []),
      `Kỳ báo cáo: ${nhanKy(loc)}`,
      ...moTaLoc,
    ],
    cot: [
      { tieuDe: "STT", rong: 6 },
      { tieuDe: mau.nhomTheo === "TONG" ? "Đơn vị" : NHAN_NHOM[mau.nhomTheo].replace("Theo ", "").replace(/^./, (x) => x.toUpperCase()), rong: 36 },
      ...cot.map((c) => ({ tieuDe: c.tieuDe, rong: 16, dinhDang: dinhDang(c) })),
    ],
    dong: dong.map((d, i) => [i + 1, d.nhom, ...d.giaTri]),
    dongTong: mau.nhomTheo === "TONG" ? undefined : ["", "TỔNG CỘNG", ...tong],
  });

  const soCot = cot.length + 2;
  const homNay = new Date();
  ws.addRow([]);
  const dongNgay = ws.addRow([]);
  dongNgay.getCell(soCot).value = `……, ngày ${homNay.getDate()} tháng ${homNay.getMonth() + 1} năm ${homNay.getFullYear()}`;
  const dongKy = ws.addRow([]);
  dongKy.getCell(2).value = "NGƯỜI LẬP BIỂU";
  dongKy.getCell(soCot).value = "THỦ TRƯỞNG ĐƠN VỊ";
  dongKy.font = { bold: true };
  ws.addRow([]).getCell(2).value = "(Ký, ghi rõ họ tên)";
  ws.getRow(ws.rowCount).getCell(soCot).value = "(Ký tên, đóng dấu)";

  await ghiNhatKy({
    ...nguoi,
    hanhDong: "XUAT_BAO_CAO_CAP_TREN",
    doiTuong: "MauBieuBaoCao",
    doiTuongId: mau.id,
    chiTiet: `${mau.ma} v${mau.phienBan}, kỳ ${nhanKy(loc)}${moTaLoc.length ? `, ${moTaLoc.join(", ")}` : ""}`,
  });
  const hauTo = [loc.tu, loc.den].map((d) => (d ? d.toISOString().slice(0, 10) : "")).filter(Boolean).join("_");
  return { tenFile: `${mau.ma}-v${mau.phienBan}${hauTo ? `-${hauTo}` : ""}.xlsx`, noiDung: await sangBuffer(wb) };
}

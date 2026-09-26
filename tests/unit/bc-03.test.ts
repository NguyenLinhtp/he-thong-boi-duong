import { afterAll, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import { thietLapHocPhi } from "@/server/services/hp/hp-01-thiet-lap";
import { xacNhanThanhToan, xacNhanMienGiam } from "@/server/services/hp/hp-02-thanh-toan";
import { baoCaoDoanhThu, baoCaoCongNo } from "@/server/services/hp/hp-05-bao-cao";
import { baoCaoTaiChinhHocPhi, xuatExcelBaoCaoTaiChinh } from "@/server/services/bc/bc-03-bao-cao-tai-chinh";
import { khoangNgay } from "@/server/services/bc/khoang-ngay";

const uid = () => crypto.randomUUID().slice(0, 8);
const loaiHinhIds: string[] = [];
const chuongTrinhIds: string[] = [];
const khoaIds: string[] = [];
const hocVienIds: string[] = [];
const dotIds: string[] = [];
const donViIds: string[] = [];
const TC = { nguoiXacNhanTen: "Cán bộ tài chính BC-03" };

afterAll(async () => {
  await prisma.phieuThu.deleteMany({ where: { hocPhi: { khoaId: { in: khoaIds } } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hopDongLienKet.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.donViLienKet.deleteMany({ where: { id: { in: donViIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.dotTuyenSinh.deleteMany({ where: { id: { in: dotIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhIds } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhIds } } });
});

async function taoDot() {
  const dot = await prisma.dotTuyenSinh.create({
    data: { ma: `DOT_BC03_${uid()}`, ten: "Đợt BC-03", ngayBatDau: new Date("2026-01-01"), ngayKetThuc: new Date("2026-12-31") },
  });
  dotIds.push(dot.id);
  return dot;
}

/** Khóa có n học viên Chính thức (+1 qua ĐVLK nếu quaDvlk), học phí mucHocPhi thiết lập qua HP-01. */
async function taoKhoa(dotId: string, soHocVien: number, mucHocPhi: number, quaDvlk = false) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_BC03_${uid()}`, ten: "LH" } });
  loaiHinhIds.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT_BC03_${uid()}`, ten: "Chương trình BC-03", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH" },
  });
  chuongTrinhIds.push(ct.id);
  const khoa = await prisma.khoa.create({
    data: { maKhoa: `K_BC03_${uid()}`, chuongTrinhId: ct.id, siSoToiDa: 30, trangThai: "DANG_DIEN_RA", dotTuyenSinhId: dotId },
  });
  khoaIds.push(khoa.id);
  const tao = async (hoTen: string, hopDongLienKetId: string | null = null) => {
    const hv = await prisma.hocVien.create({ data: { maHocVien: `HV_BC03_${uid()}`, hoTen } });
    hocVienIds.push(hv.id);
    await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId: khoa.id, trangThai: "CHINH_THUC", hopDongLienKetId } });
    return hv;
  };
  const dsHv = [];
  for (let i = 0; i < soHocVien; i++) dsHv.push(await tao(`HV ${i + 1}`));
  if (quaDvlk) {
    const dv = await prisma.donViLienKet.create({ data: { ma: `DV_BC03_${uid()}`, ten: "ĐVLK" } });
    donViIds.push(dv.id);
    const hd = await prisma.hopDongLienKet.create({ data: { maHopDong: `HD_BC03_${uid()}`, donViLienKetId: dv.id, khoaId: khoa.id } });
    await tao("HV qua ĐVLK", hd.id);
  }
  await thietLapHocPhi(khoa.id, { mucHocPhi });
  const hocPhi = await Promise.all(
    dsHv.map((hv) => prisma.hocPhi.findUniqueOrThrow({ where: { hocVienId_khoaId: { hocVienId: hv.id, khoaId: khoa.id } } })),
  );
  return { khoa, hocPhi };
}

/**
 * Khóa A: HV1 nộp đủ 1.000.000 (tiền mặt), HV2 nộp 300.000 (chuyển khoản),
 * HV3 chưa nộp, HV4 miễn giảm, 1 HV qua ĐVLK. Khóa B (đợt khác) HV nộp 500.000.
 */
async function duLieuMau() {
  const dotA = await taoDot();
  const a = await taoKhoa(dotA.id, 4, 1_000_000, true);
  await xacNhanThanhToan(a.hocPhi[0].id, { ...TC, soTien: 1_000_000, hinhThucNop: "Tiền mặt" });
  await xacNhanThanhToan(a.hocPhi[1].id, { ...TC, soTien: 300_000, hinhThucNop: "Chuyển khoản" });
  await xacNhanMienGiam(a.hocPhi[3].id, { ...TC, lyDo: "Đối tượng chính sách" });
  const dotB = await taoDot();
  const b = await taoKhoa(dotB.id, 1, 500_000);
  await xacNhanThanhToan(b.hocPhi[0].id, { ...TC, soTien: 500_000, hinhThucNop: "Tiền mặt" });
  return { dotA, a, dotB, b };
}

const homNay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

describe("BC-03 báo cáo tài chính học phí", () => {
  it("doanh thu, công nợ, tình hình theo khóa của 1 đợt; khớp đúng số liệu HP-05", async () => {
    const { dotA, a } = await duLieuMau();

    const bc = await baoCaoTaiChinhHocPhi({ ...khoangNgay(homNay(), homNay()), dotTuyenSinhId: dotA.id });

    expect([bc.doanhThu.tong, bc.doanhThu.soPhieuThu]).toEqual([1_300_000, 2]);
    expect(bc.doanhThu.theoHinhThuc.sort((x, y) => x.hinhThuc.localeCompare(y.hinhThuc))).toEqual([
      { hinhThuc: "Chuyển khoản", soTien: 300_000, soPhieu: 1 },
      { hinhThuc: "Tiền mặt", soTien: 1_000_000, soPhieu: 1 },
    ]);
    expect([bc.congNo.tong, bc.congNo.soHocVien]).toEqual([1_700_000, 2]);
    expect(bc.theoKhoa).toHaveLength(1);
    expect(bc.theoKhoa[0]).toMatchObject({
      khoaId: a.khoa.id,
      soHocVien: 5,
      phaiThu: 3_000_000,
      daThuLuyKe: 1_300_000,
      thuTrongKy: 1_300_000,
      conNo: 1_700_000,
      soConNo: 2,
      soDaNopDu: 1,
      soMienGiam: 1,
      soQuaDvlk: 1,
    });

    // "số liệu phải khớp module Quản lý học phí"
    const hp05DoanhThu = await baoCaoDoanhThu({ khoaId: a.khoa.id });
    const hp05CongNo = await baoCaoCongNo({ khoaId: a.khoa.id });
    expect(bc.doanhThu.tong).toBe(hp05DoanhThu.tongDoanhThu);
    expect(bc.congNo.tong).toBe(hp05CongNo.tongConNo);
    expect(bc.doiSoat).toEqual({ doanhThuKhopPhieuThu: true, congNoKhopTheoKhoa: true, lechHocPhi: [] });
    expect(bc.phieuThu.map((pt) => pt.soTien).sort()).toEqual([1_000_000, 300_000].sort());
  });

  it("kỳ không có phiếu thu: doanh thu 0, công nợ vẫn là số tại thời điểm lập báo cáo", async () => {
    const { dotA } = await duLieuMau();
    const bc = await baoCaoTaiChinhHocPhi({ ...khoangNgay("2020-01-01", "2020-12-31"), dotTuyenSinhId: dotA.id });
    expect([bc.doanhThu.tong, bc.phieuThu.length, bc.theoKhoa[0].thuTrongKy]).toEqual([0, 0, 0]);
    expect(bc.congNo.tong).toBe(1_700_000);
    expect(bc.theoKhoa[0].daThuLuyKe).toBe(1_300_000);
  });

  it("lọc theo khóa không lẫn khóa khác", async () => {
    const { b } = await duLieuMau();
    const bc = await baoCaoTaiChinhHocPhi({ khoaId: b.khoa.id });
    expect([bc.doanhThu.tong, bc.congNo.tong, bc.theoKhoa.map((k) => k.khoaId)]).toEqual([500_000, 0, [b.khoa.id]]);
  });

  it("đối soát phát hiện khoản học phí có số đã nộp lệch tổng phiếu thu", async () => {
    const { dotA, a } = await duLieuMau();
    await prisma.hocPhi.update({ where: { id: a.hocPhi[1].id }, data: { soTienDaNop: 350_000 } });

    const { doiSoat } = await baoCaoTaiChinhHocPhi({ dotTuyenSinhId: dotA.id });

    expect(doiSoat.lechHocPhi).toEqual([
      expect.objectContaining({ hoTen: "HV 2", daNopGhiNhan: 350_000, tongPhieuThu: 300_000 }),
    ]);
  });

  it("xuất Excel 4 sheet: tổng hợp, phiếu thu, công nợ, đối soát", async () => {
    const { dotA, a } = await duLieuMau();
    const { noiDung } = await xuatExcelBaoCaoTaiChinh({ ...khoangNgay(homNay(), homNay()), dotTuyenSinhId: dotA.id }, ["Đợt: BC-03"]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(noiDung as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Tổng hợp", "Phiếu thu trong kỳ", "Công nợ", "Đối soát"]);
    const dong = (ten: string) => {
      const ds: string[] = [];
      wb.getWorksheet(ten)!.eachRow((r) => ds.push((r.values as unknown[]).slice(1).map((v) => String(v ?? "")).join("|")));
      return ds;
    };
    expect(dong("Tổng hợp")).toContain(`${a.khoa.maKhoa}|Chương trình BC-03|1000000|5|3000000|1300000|1300000|1700000|2|1|1|1`);
    expect(dong("Tổng hợp").join(" / ")).toContain("Doanh thu trong kỳ (tổng phiếu thu): 1.300.000 đ - 2 phiếu");
    expect(dong("Phiếu thu trong kỳ").some((d) => d.startsWith("|TỔNG CỘNG|") && d.includes("1300000"))).toBe(true);
    expect(dong("Công nợ").filter((d) => /^\d+\|/.test(d))).toHaveLength(2);
    expect(dong("Đối soát").join(" / ")).toContain("Số đã nộp ghi nhận = tổng phiếu thu từng khoản: KHỚP");
  });
});

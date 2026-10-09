import { afterAll, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import { baoCaoDonViLienKet, docLocBaoCaoDvlk, xuatExcelBaoCaoDvlk } from "@/server/services/dvlk/dvlk-07-bao-cao";
import { khoangNgay } from "@/server/services/bc/khoang-ngay";
import { KhoangNgayKhongHopLeError } from "@/server/services/bc/loi-bao-cao";

const uid = () => crypto.randomUUID().slice(0, 8);
const ids = { loaiHinh: [] as string[], chuongTrinh: [] as string[], khoa: [] as string[], hocVien: [] as string[], donVi: [] as string[] };

afterAll(async () => {
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.hopDongLienKet.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.donViLienKet.deleteMany({ where: { id: { in: ids.donVi } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: ids.hocVien } } });
  await prisma.khoa.deleteMany({ where: { id: { in: ids.khoa } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: ids.chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: ids.loaiHinh } } });
});

async function taoKhoa() {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH07_${uid()}`, ten: "LH" } });
  ids.loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT07_${uid()}`,
      ten: "CT DVLK-07",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      phuongThucDangKys: ["QUA_DON_VI_LIEN_KET"],
    },
  });
  ids.chuongTrinh.push(ct.id);
  const khoa = await prisma.khoa.create({ data: { maKhoa: `K07_${uid()}`, chuongTrinhId: ct.id, siSoToiDa: 30, trangThai: "DANG_DIEN_RA" } });
  ids.khoa.push(khoa.id);
  return khoa;
}

async function taoDonVi() {
  const dv = await prisma.donViLienKet.create({ data: { ma: `DV07_${uid()}`, ten: `Đơn vị 07 ${uid()}` } });
  ids.donVi.push(dv.id);
  return dv;
}

type TrangThaiHv = "CHINH_THUC" | "HOAN_THANH" | "THOI_HOC" | "HUY_QUA_HAN_NOP_GIAY" | "CHO_NOP_GIAY";

async function themHocVien(
  hopDong: { id: string; khoaId: string },
  trangThai: TrangThaiHv,
  hocPhi?: "DA_HOAN_TAT" | "CHO_THANH_LY_HOP_DONG",
) {
  const hv = await prisma.hocVien.create({ data: { maHocVien: `HV07_${uid()}`, hoTen: "HV" } });
  ids.hocVien.push(hv.id);
  await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId: hopDong.khoaId, trangThai, hopDongLienKetId: hopDong.id } });
  if (hocPhi) {
    await prisma.hocPhi.create({ data: { hocVienId: hv.id, khoaId: hopDong.khoaId, soTienPhaiNop: 0, trangThai: hocPhi } });
  }
  return hv;
}

const LAP_HD = new Date("2026-01-10T08:00:00");
const NGAY_THANH_LY = new Date("2026-03-15T10:00:00");

/**
 * Đơn vị 1:
 *  HĐ A (khóa 1) - đã thanh lý 15/03/2026, quyết toán 3.000.000, chốt 2 HV hợp lệ (đều Đã hoàn tất)
 *  HĐ B (khóa 2) - chưa thanh lý, đơn giá 500.000: 2 chính thức + 1 thôi học (hợp lệ 3),
 *                  1 hủy quá hạn (không tính), 1 chờ nộp giấy (thực tế, chưa hợp lệ)
 * Đơn vị 2: HĐ C chưa thanh lý, chưa có đơn giá, 1 HV chính thức.
 */
async function taoDuLieu() {
  const [khoa1, khoa2] = [await taoKhoa(), await taoKhoa()];
  const dv1 = await taoDonVi();
  const dv2 = await taoDonVi();
  const hdA = await prisma.hopDongLienKet.create({
    data: {
      maHopDong: `HD07A_${uid()}`,
      donViLienKetId: dv1.id,
      khoaId: khoa1.id,
      soLuongDuKien: 3,
      donGiaThoaThuan: 1_500_000,
      trangThai: "DA_THANH_LY",
      ngayQuyetToan: NGAY_THANH_LY,
      soTienQuyetToan: 3_000_000,
      soLuongThucTe: 2,
      soHocVienHoanThanh: 2,
      soHocVienThoiHoc: 0,
      soBienBanThanhLy: `BBTL-07A-${uid()}`,
      createdAt: LAP_HD,
    },
  });
  const hdB = await prisma.hopDongLienKet.create({
    data: { maHopDong: `HD07B_${uid()}`, donViLienKetId: dv1.id, khoaId: khoa2.id, soLuongDuKien: 5, donGiaThoaThuan: 500_000, createdAt: LAP_HD },
  });
  const hdC = await prisma.hopDongLienKet.create({
    data: { maHopDong: `HD07C_${uid()}`, donViLienKetId: dv2.id, khoaId: khoa2.id, createdAt: LAP_HD },
  });
  const a1 = await themHocVien(hdA, "HOAN_THANH", "DA_HOAN_TAT");
  await themHocVien(hdA, "HOAN_THANH", "DA_HOAN_TAT");
  const b1 = await themHocVien(hdB, "CHINH_THUC", "CHO_THANH_LY_HOP_DONG");
  await themHocVien(hdB, "CHINH_THUC");
  await themHocVien(hdB, "THOI_HOC");
  await themHocVien(hdB, "HUY_QUA_HAN_NOP_GIAY");
  await themHocVien(hdB, "CHO_NOP_GIAY");
  await themHocVien(hdC, "CHINH_THUC");
  return { khoa1, khoa2, dv1, dv2, hdA, hdB, hdC, a1, b1 };
}

describe("DVLK-07 báo cáo công nợ và doanh thu theo đơn vị liên kết", () => {
  it("doanh thu = quyết toán hợp đồng đã thanh lý; công nợ = đơn giá × HV hợp lệ của hợp đồng chưa thanh lý; khớp đối soát", async () => {
    const f = await taoDuLieu();
    const bc = await baoCaoDonViLienKet({ donViLienKetId: f.dv1.id });

    expect(bc.theoDonVi).toHaveLength(1);
    expect(bc.theoDonVi[0]).toMatchObject({
      maDonVi: f.dv1.ma,
      soHopDong: 2,
      soDaThanhLy: 1,
      soChuaThanhLy: 1,
      soDuKien: 8,
      soThucTe: 6, // 2 (A) + 4 (B, trừ 1 hủy quá hạn)
      soHopLe: 5, // 2 (A) + 3 (B: 2 chính thức + 1 thôi học)
      doanhThu: 3_000_000,
      congNoTamTinh: 1_500_000,
      soChuaCoDonGia: 0,
    });
    const a = bc.chiTiet.find((c) => c.hopDongId === f.hdA.id)!;
    expect(a).toMatchObject({ daThanhLy: true, doanhThu: 3_000_000, congNoTamTinh: 0, soChotBienBan: 2, soHopLe: 2 });
    const b = bc.chiTiet.find((c) => c.hopDongId === f.hdB.id)!;
    expect(b).toMatchObject({ daThanhLy: false, doanhThu: 0, congNoTamTinh: 1_500_000, soThoiHoc: 1 });

    expect(bc.doiSoat).toMatchObject({ doanhThuHopDong: 3_000_000, doanhThuKhop: true, soChuaThanhLyKhop: true, lech: [] });
    // không lộ học phí cá nhân học viên
    expect(JSON.stringify(bc)).not.toMatch(/soTienPhaiNop|soTienDaNop|hocVienId/);
  });

  it("hợp đồng chưa có đơn giá: không cộng vào công nợ, đếm riêng", async () => {
    const f = await taoDuLieu();
    const bc = await baoCaoDonViLienKet({ donViLienKetId: f.dv2.id });
    expect(bc.tong).toMatchObject({ soHopDong: 1, soChuaThanhLy: 1, congNoTamTinh: 0, soChuaCoDonGia: 1, soHopLe: 1 });
    expect(bc.chiTiet[0].chuaCoDonGia).toBe(true);
  });

  it("theo thời gian: doanh thu chỉ tính khi thanh lý trong kỳ; hợp đồng thanh lý trước kỳ / lập sau kỳ bị loại", async () => {
    const f = await taoDuLieu();
    const loc = (tu: string, den: string) => ({ ...khoangNgay(tu, den), donViLienKetId: f.dv1.id });

    const thang3 = await baoCaoDonViLienKet(loc("2026-03-01", "2026-03-15"));
    expect(thang3.tong).toMatchObject({ soHopDong: 2, doanhThu: 3_000_000, soThanhLyTrongKy: 1 });

    // kỳ trước ngày thanh lý: HĐ A còn trong phạm vi nhưng chưa phát sinh doanh thu
    const thang2 = await baoCaoDonViLienKet(loc("2026-02-01", "2026-02-28"));
    expect(thang2.tong).toMatchObject({ soHopDong: 2, doanhThu: 0, soThanhLyTrongKy: 0 });
    expect(thang2.doiSoat.doanhThuKhop).toBe(true);

    // kỳ sau khi thanh lý: HĐ A đã xong trước kỳ -> loại, chỉ còn công nợ HĐ B
    const thang4 = await baoCaoDonViLienKet(loc("2026-04-01", "2026-04-30"));
    expect(thang4.chiTiet.map((c) => c.hopDongId)).toEqual([f.hdB.id]);
    expect(thang4.tong).toMatchObject({ doanhThu: 0, congNoTamTinh: 1_500_000 });

    // kỳ trước khi lập hợp đồng: không có hợp đồng nào
    const truocKhiLap = await baoCaoDonViLienKet(loc("2025-12-01", "2025-12-31"));
    expect(truocKhiLap.chiTiet).toHaveLength(0);
  });

  it("lọc theo khóa", async () => {
    const f = await taoDuLieu();
    const bc = await baoCaoDonViLienKet({ khoaId: f.khoa2.id });
    expect(bc.chiTiet.map((c) => c.hopDongId).sort()).toEqual([f.hdB.id, f.hdC.id].sort());
    expect(bc.theoDonVi).toHaveLength(2);
  });

  it("đối soát báo LỆCH: HV hợp đồng đã thanh lý chưa Đã hoàn tất, HV hợp đồng chưa thanh lý đã Đã hoàn tất, số HV khác biên bản", async () => {
    const f = await taoDuLieu();
    await prisma.hocPhi.updateMany({ where: { hocVienId: f.a1.id }, data: { trangThai: "CHO_THANH_LY_HOP_DONG" } });
    await prisma.hocPhi.updateMany({ where: { hocVienId: f.b1.id }, data: { trangThai: "DA_HOAN_TAT" } });
    await themHocVien(f.hdA, "CHINH_THUC", "DA_HOAN_TAT"); // thêm HV sau khi đã chốt biên bản

    const bc = await baoCaoDonViLienKet({ donViLienKetId: f.dv1.id });
    const lechA = bc.doiSoat.lech.find((x) => x.maHopDong === f.hdA.maHopDong)!;
    expect(lechA.lyDo.join(" | ")).toMatch(/hiện tại 3 khác số chốt trên biên bản 2/);
    expect(lechA.lyDo.join(" | ")).toMatch(/1 học viên hợp lệ chưa ở trạng thái tài chính "Đã hoàn tất"/);
    const lechB = bc.doiSoat.lech.find((x) => x.maHopDong === f.hdB.maHopDong)!;
    expect(lechB.lyDo).toEqual(['1 học viên đã "Đã hoàn tất" dù hợp đồng chưa thanh lý']);
  });

  it("chặn kỳ báo cáo không hợp lệ", async () => {
    await expect(docLocBaoCaoDvlk({ tuNgay: "2026-05-01", denNgay: "2026-04-01" })).rejects.toThrow(KhoangNgayKhongHopLeError);
    await expect(docLocBaoCaoDvlk({ tuNgay: "01/05/2026" })).rejects.toThrow(KhoangNgayKhongHopLeError);
  });

  it("phân quyền: Cán bộ tài chính và Cán bộ quản lý đào tạo (Lãnh đạo) được xem; Cán bộ đơn vị liên kết không", async () => {
    const quyen = await prisma.vaiTroChucNang.findMany({
      where: { chucNangHeThong: { maCN: "DVLK-07" } },
      include: { vaiTro: true },
    });
    const dsVaiTro = quyen.map((q) => q.vaiTro.ma).sort();
    expect(dsVaiTro).toEqual(["CAN_BO_QUAN_LY_DAO_TAO", "CAN_BO_TAI_CHINH"]);
  });

  it("xuất Excel: 3 sheet, dòng tổng khớp số liệu", async () => {
    const f = await taoDuLieu();
    const { noiDung, bc } = await xuatExcelBaoCaoDvlk({ donViLienKetId: f.dv1.id }, ["Đơn vị liên kết: test"]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(noiDung as unknown as ArrayBuffer);
    expect(wb.worksheets.map((ws) => ws.name)).toEqual(["Theo đơn vị", "Chi tiết hợp đồng", "Đối soát"]);
    const ws = wb.getWorksheet("Theo đơn vị")!;
    const dongTong = ws.getRow(ws.rowCount).values as unknown[];
    expect(dongTong[1]).toBe("TỔNG CỘNG");
    expect(dongTong[9]).toBe(bc.tong.doanhThu);
    expect(dongTong[10]).toBe(bc.tong.congNoTamTinh);
  });
});

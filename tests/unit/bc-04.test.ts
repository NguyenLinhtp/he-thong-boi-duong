import { afterAll, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import {
  taoMauBieu,
  capNhatMauBieu,
  ngungApDungMauBieu,
  lapBaoCaoTheoMau,
  xuatExcelTheoMau,
  taoMauMacDinh,
} from "@/server/services/bc/bc-04-mau-bieu";
import { khoangNgay } from "@/server/services/bc/khoang-ngay";
import { MauBieuKhongHopLeError, KhongTimThayMauBieuError } from "@/server/services/bc/loi-bao-cao";

const uid = () => crypto.randomUUID().slice(0, 8).toUpperCase();
const ids = { loaiHinh: [] as string[], chuongTrinh: [] as string[], khoa: [] as string[], hocVien: [] as string[], dot: [] as string[], maBieu: [] as string[] };
const NGUOI = { nguoiThucHienTen: "Cán bộ test BC-04" };

afterAll(async () => {
  await prisma.phieuThu.deleteMany({ where: { hocPhi: { khoaId: { in: ids.khoa } } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.ketQuaKhoa.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: ids.hocVien } } });
  await prisma.khoa.deleteMany({ where: { id: { in: ids.khoa } } });
  await prisma.dotTuyenSinh.deleteMany({ where: { id: { in: ids.dot } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: ids.chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: ids.loaiHinh } } });
  await prisma.mauBieuBaoCao.deleteMany({ where: { ma: { in: ids.maBieu } } });
});

const cot = (...chiTieu: string[]) => chiTieu.map((c) => ({ chiTieu: c }));
const maMoi = () => {
  const ma = `T-${uid()}`;
  ids.maBieu.push(ma);
  return ma;
};

/**
 * Đợt riêng, kỳ 1-6/2026: loại hình "LH A" có 2 khóa (K1: 2 HV đạt, 1 thôi học;
 * K2 chưa có KQ, 1 HV), loại hình "LH B" 1 khóa (1 HV không đạt). K1 học phí
 * 1.000.000/HV, 1 phiếu thu 600.000 trong kỳ.
 */
async function duLieuMau() {
  const dot = await prisma.dotTuyenSinh.create({
    data: { ma: `DOT_BC04_${uid()}`, ten: "Đợt BC-04", ngayBatDau: new Date("2026-01-01"), ngayKetThuc: new Date("2026-06-30") },
  });
  ids.dot.push(dot.id);
  const taoLh = async (ten: string) => {
    const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_BC04_${uid()}`, ten } });
    ids.loaiHinh.push(lh.id);
    return lh;
  };
  const a = await taoLh(`LH A ${uid()}`);
  const b = await taoLh(`LH B ${uid()}`);
  const taoKhoa = async (lhId: string, hv: { trangThai: "HOAN_THANH" | "THOI_HOC" | "CHINH_THUC"; dat?: boolean }[], pheDuyet: boolean) => {
    const ct = await prisma.chuongTrinh.create({
      data: { maCT: `CT_BC04_${uid()}`, ten: `CT ${uid()}`, loaiHinhBoiDuongId: lhId, trangThai: "DA_BAN_HANH" },
    });
    ids.chuongTrinh.push(ct.id);
    const khoa = await prisma.khoa.create({
      data: {
        maKhoa: `K_BC04_${uid()}`,
        chuongTrinhId: ct.id,
        siSoToiDa: 10,
        dotTuyenSinhId: dot.id,
        trangThai: "DA_KET_THUC",
        thoiGianKhaiGiang: new Date("2026-02-01T08:00:00"),
        thoiGianBeGiang: new Date("2026-03-01T08:00:00"),
      },
    });
    ids.khoa.push(khoa.id);
    const dsHv = [];
    for (const h of hv) {
      const x = await prisma.hocVien.create({ data: { maHocVien: `HV_BC04_${uid()}`, hoTen: "HV" } });
      ids.hocVien.push(x.id);
      await prisma.dangKyHoc.create({ data: { hocVienId: x.id, khoaId: khoa.id, trangThai: h.trangThai } });
      if (h.dat !== undefined) {
        await prisma.ketQuaKhoa.create({ data: { hocVienId: x.id, khoaId: khoa.id, datHocTap: h.dat, daPheDuyet: pheDuyet } });
      }
      dsHv.push(x);
    }
    return { khoa, dsHv };
  };
  const k1 = await taoKhoa(a.id, [{ trangThai: "HOAN_THANH", dat: true }, { trangThai: "HOAN_THANH", dat: true }, { trangThai: "THOI_HOC" }], true);
  await taoKhoa(a.id, [{ trangThai: "CHINH_THUC" }], false);
  await taoKhoa(b.id, [{ trangThai: "HOAN_THANH", dat: false }], true);
  const hp = await prisma.hocPhi.create({
    data: { hocVienId: k1.dsHv[0].id, khoaId: k1.khoa.id, soTienPhaiNop: 1_000_000, soTienDaNop: 600_000, trangThai: "CON_NO" },
  });
  await prisma.phieuThu.create({ data: { soPhieu: `PT_BC04_${uid()}`, hocPhiId: hp.id, soTien: 600_000, ngayLap: new Date("2026-02-10T09:00:00") } });
  return { dot, a, b, k1 };
}

const KY = khoangNgay("2026-01-01", "2026-06-30");

describe("BC-04 xuất báo cáo theo mẫu gửi cấp trên", () => {
  it("tạo mẫu biểu phiên bản 1; chặn thiếu tên, chỉ tiêu ngoài danh mục/trùng, không có cột, trùng số hiệu", async () => {
    const ma = maMoi();
    const mau = await taoMauBieu({ ma: ma.toLowerCase(), ten: "Biểu thử", nhomTheo: "LOAI_HINH", cot: cot("soKhoa", "soDaNhan") }, NGUOI);
    expect([mau.ma, mau.phienBan, mau.dangApDung]).toEqual([ma, 1, true]);
    expect(mau.cot).toEqual([
      { chiTieu: "soKhoa", tieuDe: "Số khóa bồi dưỡng" },
      { chiTieu: "soDaNhan", tieuDe: "Số học viên tham gia" },
    ]);

    const base = { ma: maMoi(), ten: "X", nhomTheo: "TONG" as const };
    await expect(taoMauBieu({ ...base, ten: " ", cot: cot("soKhoa") }, NGUOI)).rejects.toThrow(MauBieuKhongHopLeError);
    await expect(taoMauBieu({ ...base, cot: cot("khongCo") }, NGUOI)).rejects.toThrow(/không có trong danh mục/);
    await expect(taoMauBieu({ ...base, cot: cot("soKhoa", "soKhoa") }, NGUOI)).rejects.toThrow(/trùng/);
    await expect(taoMauBieu({ ...base, cot: [] }, NGUOI)).rejects.toThrow(MauBieuKhongHopLeError);
    await expect(taoMauBieu({ ma, ten: "Y", nhomTheo: "TONG", cot: cot("soKhoa") }, NGUOI)).rejects.toThrow(/đã có/);
  });

  it("cập nhật mẫu khi quy định thay đổi = phiên bản mới, giữ phiên bản cũ; ngừng áp dụng", async () => {
    const ma = maMoi();
    const v1 = await taoMauBieu({ ma, ten: "Biểu", nhomTheo: "TONG", cot: cot("soKhoa") }, NGUOI);
    const v2 = await capNhatMauBieu(ma, { ten: "Biểu (sửa đổi)", nhomTheo: "LOAI_HINH", cot: [{ chiTieu: "soDaNhan", tieuDe: "Số người học" }] }, NGUOI);

    expect(v2.phienBan).toBe(2);
    const ds = await prisma.mauBieuBaoCao.findMany({ where: { ma }, orderBy: { phienBan: "asc" } });
    expect(ds.map((m) => [m.phienBan, m.dangApDung, m.ten])).toEqual([
      [1, false, "Biểu"],
      [2, true, "Biểu (sửa đổi)"],
    ]);
    expect(ds[0].id).toBe(v1.id);

    await ngungApDungMauBieu(ma, NGUOI);
    expect(await prisma.mauBieuBaoCao.count({ where: { ma, dangApDung: true } })).toBe(0);
    await expect(ngungApDungMauBieu(ma, NGUOI)).rejects.toThrow(KhongTimThayMauBieuError);
    expect((await capNhatMauBieu(ma, { ten: "Biểu", nhomTheo: "TONG", cot: cot("soKhoa") }, NGUOI)).phienBan).toBe(3);
    await expect(capNhatMauBieu(maMoi(), { ten: "X", nhomTheo: "TONG", cot: cot("soKhoa") }, NGUOI)).rejects.toThrow(KhongTimThayMauBieuError);
    expect(await prisma.nhatKyThaoTac.count({ where: { hanhDong: "CAP_NHAT_MAU_BIEU_BAO_CAO", chiTiet: { startsWith: ma } } })).toBe(2);
  });

  it("lập số liệu theo mẫu: nhóm theo loại hình, tỷ lệ hoàn thành trên khóa đã có kết quả, chỉ tiêu tài chính từ BC-03", async () => {
    const f = await duLieuMau();
    const mau = await taoMauBieu(
      { ma: maMoi(), ten: "Biểu", nhomTheo: "LOAI_HINH", cot: cot("soKhoa", "soDaNhan", "soHoanThanh", "tyLeHoanThanh", "phaiThu", "thuTrongKy", "conNo") },
      NGUOI,
    );

    const bc = await lapBaoCaoTheoMau(mau.id, { ...KY, dotTuyenSinhId: f.dot.id });

    // LH A: 2 khóa, 4 HV đã nhận (3 + 1); K1 có 2 HV đạt nhưng 1 người còn nợ học phí -> 1 hoàn thành / 3; K2 chưa có KQ không tính tỷ lệ
    const theoNhom = Object.fromEntries(bc.dong.map((d) => [d.nhom, d.giaTri]));
    expect(theoNhom[f.a.ten]).toEqual([2, 4, 1, 33.3, 1_000_000, 600_000, 400_000]);
    expect(theoNhom[f.b.ten]).toEqual([1, 1, 0, 0, 0, 0, 0]);
    expect(bc.tong).toEqual([3, 5, 1, 25, 1_000_000, 600_000, 400_000]);

    const tong = await taoMauBieu({ ma: maMoi(), ten: "Tổng", nhomTheo: "TONG", cot: cot("soKhoa", "soThoiHoc") }, NGUOI);
    expect((await lapBaoCaoTheoMau(tong.id, { ...KY, dotTuyenSinhId: f.dot.id })).dong).toEqual([{ nhom: "Toàn đơn vị", giaTri: [3, 1] }]);
  });

  it("xuất Excel đúng phiên bản mẫu (kể cả phiên bản cũ), có đầu biểu, dòng tổng, phần ký; ghi nhật ký", async () => {
    const f = await duLieuMau();
    const ma = maMoi();
    const v1 = await taoMauBieu(
      { ma, ten: "Báo cáo kết quả bồi dưỡng", coQuanNhan: "Sở GD&ĐT", canCu: "Công văn 123", nhomTheo: "LOAI_HINH", cot: cot("soKhoa", "soDaNhan") },
      NGUOI,
    );
    await capNhatMauBieu(ma, { ten: "Mẫu mới", nhomTheo: "TONG", cot: cot("soVanBangDaCap") }, NGUOI);

    const { tenFile, noiDung } = await xuatExcelTheoMau(v1.id, { ...KY, dotTuyenSinhId: f.dot.id }, ["Đợt: BC-04"], NGUOI);
    expect(tenFile).toMatch(new RegExp(`^${ma}-v1-`));

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(noiDung as unknown as ArrayBuffer);
    const dong: string[] = [];
    wb.worksheets[0].eachRow((r) => dong.push((r.values as unknown[]).slice(1).map((v) => String(v ?? "")).join("|")));
    const toanBo = dong.join(" / ");
    for (const chuoi of ["BÁO CÁO KẾT QUẢ BỒI DƯỠNG", `Biểu số: ${ma} (phiên bản 1)`, "Kính gửi: Sở GD&ĐT", "Căn cứ: Công văn 123", "Kỳ báo cáo: 1/1/2026 - 30/6/2026", "THỦ TRƯỞNG ĐƠN VỊ", "NGƯỜI LẬP BIỂU"]) {
      expect(toanBo).toContain(chuoi);
    }
    expect(dong).toContain("STT|Loại hình bồi dưỡng|Số khóa bồi dưỡng|Số học viên tham gia");
    expect(dong).toContain("|TỔNG CỘNG|3|5");
    expect(await prisma.nhatKyThaoTac.count({ where: { hanhDong: "XUAT_BAO_CAO_CAP_TREN", doiTuongId: v1.id } })).toBe(1);
  });

  it("tạo mẫu gợi ý ban đầu chỉ khi chưa có (chạy lại không tạo trùng)", async () => {
    await taoMauMacDinh(NGUOI);
    expect(await taoMauMacDinh(NGUOI)).toEqual([]);
    expect(await prisma.mauBieuBaoCao.count({ where: { ma: { in: ["BIEU-01", "BIEU-02"] }, dangApDung: true } })).toBeGreaterThanOrEqual(1);
  });
});

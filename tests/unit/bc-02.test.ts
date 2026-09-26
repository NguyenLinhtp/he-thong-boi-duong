import { afterAll, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import { baoCaoHoatDongDaoTao, xuatExcelBaoCaoDaoTao } from "@/server/services/bc/bc-02-bao-cao-dao-tao";
import { khoangNgay } from "@/server/services/bc/khoang-ngay";

const uid = () => crypto.randomUUID().slice(0, 8);
const loaiHinhIds: string[] = [];
const chuongTrinhIds: string[] = [];
const khoaIds: string[] = [];
const hocVienIds: string[] = [];
const dotIds: string[] = [];

afterAll(async () => {
  await prisma.chungChi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.ketQuaKhoa.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.dotTuyenSinh.deleteMany({ where: { id: { in: dotIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhIds } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhIds } } });
});

type TrangThaiDk = "CHINH_THUC" | "HOAN_THANH" | "THOI_HOC" | "KHONG_HOP_LE";

/** 1 loại hình riêng cho mỗi test để lọc cô lập khỏi dữ liệu test khác trong DB. */
async function taoLoaiHinh(ten = "Loại hình BC-02") {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_BC02_${uid()}`, ten: `${ten} ${uid()}` } });
  loaiHinhIds.push(lh.id);
  return lh;
}

async function taoKhoa(
  loaiHinhId: string,
  opts: {
    khai?: string;
    be?: string;
    trangThai?: "DANG_DIEN_RA" | "DA_KET_THUC" | "HUY";
    dotId?: string;
    hocVien?: { trangThai: TrangThaiDk; dat?: boolean; conNo?: boolean }[];
    pheDuyet?: boolean;
  } = {},
) {
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_BC02_${uid()}`,
      ten: "Chương trình BC-02",
      loaiHinhBoiDuongId: loaiHinhId,
      trangThai: "DA_BAN_HANH",
      phuongThucDangKy: "TRUC_TUYEN_NOP_GIAY",
    },
  });
  chuongTrinhIds.push(ct.id);
  const khoa = await prisma.khoa.create({
    data: {
      maKhoa: `K_BC02_${uid()}`,
      chuongTrinhId: ct.id,
      siSoToiDa: 40,
      trangThai: opts.trangThai ?? "DA_KET_THUC",
      thoiGianKhaiGiang: opts.khai ? new Date(`${opts.khai}T08:00:00`) : null,
      thoiGianBeGiang: opts.be ? new Date(`${opts.be}T17:00:00`) : null,
      dotTuyenSinhId: opts.dotId ?? null,
    },
  });
  khoaIds.push(khoa.id);
  for (const [i, hv] of (opts.hocVien ?? []).entries()) {
    const h = await prisma.hocVien.create({ data: { maHocVien: `HV_BC02_${uid()}`, hoTen: `HV ${i}` } });
    hocVienIds.push(h.id);
    await prisma.dangKyHoc.create({ data: { hocVienId: h.id, khoaId: khoa.id, trangThai: hv.trangThai } });
    if (hv.dat !== undefined) {
      await prisma.ketQuaKhoa.create({
        data: { hocVienId: h.id, khoaId: khoa.id, datHocTap: hv.dat, daPheDuyet: opts.pheDuyet ?? true, diemTongKet: hv.dat ? 8 : 3 },
      });
    }
    if (hv.conNo) {
      await prisma.hocPhi.create({
        data: { hocVienId: h.id, khoaId: khoa.id, soTienPhaiNop: 1000, soTienDaNop: 0, trangThai: "CHUA_NOP" },
      });
    }
  }
  return khoa;
}

const KY_2026_H1 = khoangNgay("2026-01-01", "2026-06-30");

describe("BC-02 báo cáo định kỳ hoạt động đào tạo", () => {
  it("số khóa, học viên, hoàn thành, tỷ lệ theo khóa; hoàn thành cần cả kết quả đạt và hoàn tất học phí", async () => {
    const lh = await taoLoaiHinh();
    const k1 = await taoKhoa(lh.id, {
      khai: "2026-03-01",
      be: "2026-04-30",
      hocVien: [
        { trangThai: "HOAN_THANH", dat: true },
        { trangThai: "HOAN_THANH", dat: true, conNo: true },
        { trangThai: "HOAN_THANH", dat: false },
        { trangThai: "THOI_HOC" },
        { trangThai: "KHONG_HOP_LE" },
      ],
    });
    await prisma.chungChi.create({
      data: { hocVienId: (await prisma.dangKyHoc.findFirstOrThrow({ where: { khoaId: k1.id, trangThai: "HOAN_THANH" }, include: { hocVien: true }, orderBy: { hocVien: { hoTen: "asc" } } })).hocVienId, khoaId: k1.id, trangThai: "DA_CAP" },
    });
    const k2 = await taoKhoa(lh.id, {
      khai: "2026-05-15",
      be: "2026-07-15",
      trangThai: "DANG_DIEN_RA",
      hocVien: [{ trangThai: "CHINH_THUC" }, { trangThai: "CHINH_THUC" }],
    });

    const bc = await baoCaoHoatDongDaoTao({ ...KY_2026_H1, loaiHinhBoiDuongId: lh.id });

    const d1 = bc.dong.find((d) => d.khoaId === k1.id)!;
    expect(d1).toMatchObject({ soDangKy: 5, soDaNhan: 4, soThoiHoc: 1, soDat: 2, soHoanThanh: 1, tyLeHoanThanh: 25, soVanBangDaCap: 1 });
    const d2 = bc.dong.find((d) => d.khoaId === k2.id)!;
    expect(d2).toMatchObject({ soDaNhan: 2, soHoanThanh: null, tyLeHoanThanh: null });

    // tỷ lệ tổng chỉ tính trên khóa đã có kết quả
    expect(bc.tong).toMatchObject({ soKhoa: 2, soKhoaCoKetQua: 1, soDaNhan: 6, soHoanThanh: 1, tyLeHoanThanh: 25 });
    expect(bc.theoTrangThai).toMatchObject({ DA_KET_THUC: 1, DANG_DIEN_RA: 1 });
    expect(bc.theoLoaiHinh).toHaveLength(1);
    expect(bc.theoLoaiHinh[0]).toMatchObject({ soKhoa: 2, soDaNhan: 6 });
  });

  it("chỉ lấy khóa có thời gian học giao với kỳ; khóa chưa có lịch dùng ngày tạo", async () => {
    const lh = await taoLoaiHinh();
    const giuaKy = await taoKhoa(lh.id, { khai: "2026-02-01", be: "2026-03-01" });
    const vatQuaDauKy = await taoKhoa(lh.id, { khai: "2025-11-01", be: "2026-01-15" });
    const truocKy = await taoKhoa(lh.id, { khai: "2025-09-01", be: "2025-12-31" });
    const sauKy = await taoKhoa(lh.id, { khai: "2026-07-01", be: "2026-08-01" });
    const chuaCoLich = await taoKhoa(lh.id);

    const ids = (await baoCaoHoatDongDaoTao({ ...KY_2026_H1, loaiHinhBoiDuongId: lh.id })).dong.map((d) => d.khoaId);
    expect(ids.sort()).toEqual([giuaKy.id, vatQuaDauKy.id].sort());
    expect(ids).not.toContain(truocKy.id);
    expect(ids).not.toContain(sauKy.id);

    // khóa chưa có lịch: tạo hôm nay -> thuộc kỳ chứa hôm nay
    const homNay = new Date();
    const chuoi = `${homNay.getFullYear()}-${String(homNay.getMonth() + 1).padStart(2, "0")}-${String(homNay.getDate()).padStart(2, "0")}`;
    const theoHomNay = await baoCaoHoatDongDaoTao({ ...khoangNgay(chuoi, chuoi), loaiHinhBoiDuongId: lh.id });
    expect(theoHomNay.dong.map((d) => d.khoaId)).toEqual([chuaCoLich.id]);
  });

  it("lọc theo đợt tuyển sinh và trạng thái khóa; kỳ rỗng thì báo cáo rỗng", async () => {
    const lh = await taoLoaiHinh();
    const dot = await prisma.dotTuyenSinh.create({
      data: { ma: `DOT_BC02_${uid()}`, ten: "Đợt 1/2026", ngayBatDau: new Date("2026-01-01"), ngayKetThuc: new Date("2026-06-30") },
    });
    dotIds.push(dot.id);
    const trongDot = await taoKhoa(lh.id, { khai: "2026-02-01", be: "2026-03-01", dotId: dot.id });
    await taoKhoa(lh.id, { khai: "2026-02-01", be: "2026-03-01" });
    const huy = await taoKhoa(lh.id, { khai: "2026-02-01", be: "2026-03-01", trangThai: "HUY", dotId: dot.id });

    expect((await baoCaoHoatDongDaoTao({ ...KY_2026_H1, dotTuyenSinhId: dot.id })).dong.map((d) => d.khoaId).sort()).toEqual(
      [trongDot.id, huy.id].sort(),
    );
    expect(
      (await baoCaoHoatDongDaoTao({ ...KY_2026_H1, dotTuyenSinhId: dot.id, trangThai: "HUY" })).dong.map((d) => d.khoaId),
    ).toEqual([huy.id]);
    const rong = await baoCaoHoatDongDaoTao({ ...khoangNgay("2020-01-01", "2020-01-31"), loaiHinhBoiDuongId: lh.id });
    expect(rong.tong).toMatchObject({ soKhoa: 0, soDaNhan: 0, tyLeHoanThanh: null });
  });

  it("xuất Excel theo mẫu: sheet tổng hợp theo loại hình (có dòng tổng) và sheet chi tiết theo khóa", async () => {
    const lh = await taoLoaiHinh("Bồi dưỡng thường xuyên");
    const k = await taoKhoa(lh.id, { khai: "2026-03-01", be: "2026-04-30", hocVien: [{ trangThai: "HOAN_THANH", dat: true }] });

    const { noiDung, bc } = await xuatExcelBaoCaoDaoTao({ ...KY_2026_H1, loaiHinhBoiDuongId: lh.id }, [`Loại hình: ${lh.ten}`]);
    expect(bc.tong.soKhoa).toBe(1);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(noiDung as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Tổng hợp", "Theo khóa"]);
    const giaTri = (ws: ExcelJS.Worksheet) => {
      const ds: string[] = [];
      ws.eachRow((r) => ds.push((r.values as unknown[]).slice(1).map((v) => String(v ?? "")).join("|")));
      return ds;
    };
    const tongHop = giaTri(wb.getWorksheet("Tổng hợp")!);
    expect(tongHop.join(" / ")).toContain("BÁO CÁO HOẠT ĐỘNG ĐÀO TẠO, BỒI DƯỠNG");
    expect(tongHop.join(" / ")).toContain("Kỳ báo cáo: 1/1/2026 - 30/6/2026");
    expect(tongHop).toContain(`${lh.ten}|1|1|1|0|1|1|100|0`);
    expect(tongHop).toContain("TỔNG CỘNG|1|1|1|0|1|1|100|0");
    expect(giaTri(wb.getWorksheet("Theo khóa")!).some((d) => d.startsWith(`1|${k.maKhoa}|`))).toBe(true);
  });
});

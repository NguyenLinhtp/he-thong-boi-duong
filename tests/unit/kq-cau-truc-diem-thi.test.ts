import { afterAll, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import {
  cauHinhDiemThiCuaKhoa,
  chuanHoaCauHinh,
  CauTrucDiemThiError,
  danhGiaTheoCauHinh,
  luuCauHinhChuongTrinh,
  luuCauHinhKhoa,
  nhapDiemThanhPhan,
} from "@/server/services/kq/cau-truc-diem-thi";
import { pheDuyetKetQua, phucKhaoDiemThanhPhan } from "@/server/services/kq/kq-04-phe-duyet";
import { nhapDiemThiTuTep } from "@/server/services/kq/kq-06-nhap-diem-tu-tep";
import { taoDotThi, themPhongThi, xepPhongThi, xuatExcelPhongThi } from "@/server/services/kh/kh-03-phong-thi";

// (bổ sung 13/10/2026 - KQ-06) cấu trúc điểm thi: điểm thành phần, hệ số, điều kiện đạt (không bắt buộc)

const NGUOI = { nguoiThucHienTen: "Cán bộ test cấu trúc điểm" };
const ids = { loaiHinh: [] as string[], chuongTrinh: [] as string[], khoa: [] as string[], hocVien: [] as string[] };

afterAll(async () => {
  await prisma.ketQuaKhoa.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.dotThi.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: ids.khoa } } });
  await prisma.thongBao.deleteMany({ where: { hocVienId: { in: ids.hocVien } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: ids.hocVien } } });
  await prisma.khoa.deleteMany({ where: { id: { in: ids.khoa } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: ids.chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: ids.loaiHinh } } });
});

const LT_TH_RIENG = { thanhPhans: [{ ten: "Lý thuyết", diemDat: 5 }, { ten: "Thực hành", diemDat: 5 }], diemDatTong: null };
const LT_TH_HE_SO = { thanhPhans: [{ ten: "Lý thuyết", heSo: 0.4 }, { ten: "Thực hành", heSo: 0.6 }], diemDatTong: 5 };

async function taoKhoa(dsTen: string[]) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_CT_${crypto.randomUUID()}`, ten: "LH cấu trúc điểm" } });
  ids.loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT_CTD_${crypto.randomUUID()}`, ten: "Thi tin học", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH", phuongThucDangKys: ["CHI_DU_THI"] },
  });
  ids.chuongTrinh.push(ct.id);
  const khoa = await prisma.khoa.create({ data: { maKhoa: `KHCT${crypto.randomUUID().slice(0, 8)}`, chuongTrinhId: ct.id, siSoToiDa: 20 } });
  ids.khoa.push(khoa.id);
  const ds = [];
  for (const hoTen of dsTen) {
    const hv = await prisma.hocVien.create({ data: { maHocVien: `HVCT${crypto.randomUUID().slice(0, 10)}`, hoTen } });
    ids.hocVien.push(hv.id);
    ds.push(await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId: khoa.id, trangThai: "CHINH_THUC", phuongThuc: "CHI_DU_THI" } }));
  }
  return { ct, khoa, ds };
}

describe("cấu hình và cách tính", () => {
  it("kiểm tra cấu hình: tên bắt buộc, không trùng, điểm đạt trong thang, điểm đạt tổng không vượt điểm tổng tối đa", () => {
    expect(() => chuanHoaCauHinh({ thanhPhans: [{ ten: " " }] })).toThrow(/chưa có tên/);
    expect(() => chuanHoaCauHinh({ thanhPhans: [{ ten: "LT" }, { ten: "lt" }] })).toThrow(/Trùng/);
    expect(() => chuanHoaCauHinh({ thanhPhans: [{ ten: "LT", diemToiDa: 10, diemDat: 11 }] })).toThrow(/0 đến 10/);
    expect(() => chuanHoaCauHinh({ thanhPhans: [{ ten: "LT", heSo: 0 }] })).toThrow(/Hệ số/);
    expect(() => chuanHoaCauHinh({ thanhPhans: [{ ten: "LT", heSo: 0.4 }], diemDatTong: 5 })).toThrow(/tối đa/);
    expect(() => chuanHoaCauHinh({ thanhPhans: [], diemDatTong: 5 })).toThrow(CauTrucDiemThiError);
    const ch = chuanHoaCauHinh(LT_TH_HE_SO);
    expect(ch.thanhPhans.map((tp) => [tp.ma, tp.heSo, tp.diemToiDa, tp.diemDat])).toEqual([
      ["ly-thuyet", 0.4, 10, null],
      ["thuc-hanh", 0.6, 10, null],
    ]);
  });

  it("mỗi phần đạt 5/10; hoặc LT×0,4 + TH×0,6 ≥ 5; không điều kiện thì không xét", () => {
    const rieng = chuanHoaCauHinh(LT_TH_RIENG);
    expect(danhGiaTheoCauHinh(rieng, { "ly-thuyet": 6, "thuc-hanh": 5 })).toEqual({ diemTong: 11, datHocTap: true, ghiChu: null });
    expect(danhGiaTheoCauHinh(rieng, { "ly-thuyet": 9, "thuc-hanh": 4 })).toMatchObject({ datHocTap: false, ghiChu: "Thực hành 4 < 5" });
    expect(danhGiaTheoCauHinh(rieng, { "ly-thuyet": 9, "thuc-hanh": null })).toMatchObject({ datHocTap: false, ghiChu: "Thiếu điểm: Thực hành" });

    const heSo = chuanHoaCauHinh(LT_TH_HE_SO);
    expect(danhGiaTheoCauHinh(heSo, { "ly-thuyet": 4, "thuc-hanh": 6 })).toEqual({ diemTong: 5.2, datHocTap: true, ghiChu: null });
    expect(danhGiaTheoCauHinh(heSo, { "ly-thuyet": 8, "thuc-hanh": 3 })).toMatchObject({ diemTong: 5, datHocTap: true });
    expect(danhGiaTheoCauHinh(heSo, { "ly-thuyet": 2, "thuc-hanh": 4 })).toMatchObject({ diemTong: 3.2, datHocTap: false });

    const khongDk = chuanHoaCauHinh({ thanhPhans: [{ ten: "Điểm thi" }] });
    expect(danhGiaTheoCauHinh(khongDk, { "diem-thi": 2 })).toEqual({ diemTong: 2, datHocTap: null, ghiChu: null });
  });
});

describe("chương trình -> khóa", () => {
  it("khóa theo chương trình, sửa riêng ở khóa; lưu điểm tính tổng + Đạt; đổi cấu hình tính lại; không xóa thành phần đã có điểm", async () => {
    const { ct, khoa, ds } = await taoKhoa(["Nguyễn An", "Lê Bình"]);
    expect((await cauHinhDiemThiCuaKhoa(khoa.id)).cauHinh).toBeNull();
    await luuCauHinhChuongTrinh(ct.id, LT_TH_RIENG, NGUOI);
    expect((await cauHinhDiemThiCuaKhoa(khoa.id)).nguon).toBe("CHUONG_TRINH");

    await nhapDiemThanhPhan(khoa.id, [
      { hocVienId: ds[0].hocVienId, diem: { "ly-thuyet": 6, "thuc-hanh": 4 } },
      { hocVienId: ds[1].hocVienId, diem: { "ly-thuyet": 7, "thuc-hanh": 8 } },
    ], NGUOI);
    await expect(nhapDiemThanhPhan(khoa.id, [{ hocVienId: ds[0].hocVienId, diem: { "ly-thuyet": 11 } }], NGUOI)).rejects.toThrow(/0 đến 10/);
    const kq = async () => Object.fromEntries((await prisma.ketQuaKhoa.findMany({ where: { khoaId: khoa.id } })).map((k) => [k.hocVienId, [Number(k.diemTongKet), k.datHocTap]]));
    expect(await kq()).toEqual({ [ds[0].hocVienId]: [10, false], [ds[1].hocVienId]: [15, true] });

    // khóa sửa riêng: hệ số 0,4/0,6, đạt tổng 5 -> tính lại: 6×0,4+4×0,6=4,8 (không đạt); 7×0,4+8×0,6=7,6
    const k = await luuCauHinhKhoa(khoa.id, { thanhPhans: [{ ma: "ly-thuyet", ten: "Lý thuyết", heSo: 0.4 }, { ma: "thuc-hanh", ten: "Thực hành", heSo: 0.6 }], diemDatTong: 5 }, NGUOI);
    expect(k.soTinhLai).toBe(2);
    expect(await kq()).toEqual({ [ds[0].hocVienId]: [4.8, false], [ds[1].hocVienId]: [7.6, true] });

    // không xóa thành phần đã có điểm; về theo chương trình được
    await expect(luuCauHinhKhoa(khoa.id, { thanhPhans: [{ ma: "ly-thuyet", ten: "Lý thuyết" }] }, NGUOI)).rejects.toThrow(/Thực hành/);
    await luuCauHinhKhoa(khoa.id, null, NGUOI);
    expect(await kq()).toEqual({ [ds[0].hocVienId]: [10, false], [ds[1].hocVienId]: [15, true] });
    await expect(luuCauHinhChuongTrinh(ct.id, { thanhPhans: [{ ma: "thuc-hanh", ten: "Thực hành" }] }, NGUOI)).rejects.toThrow(/Lý thuyết/);
  });

  it("phê duyệt chốt cấu hình vào khóa; phúc khảo theo thành phần; khóa không đặt điều kiện thì không phê duyệt", async () => {
    const { ct, khoa, ds } = await taoKhoa(["Trần Cường"]);
    await luuCauHinhChuongTrinh(ct.id, LT_TH_RIENG, NGUOI);
    await nhapDiemThanhPhan(khoa.id, [{ hocVienId: ds[0].hocVienId, diem: { "ly-thuyet": 6, "thuc-hanh": 4 } }], NGUOI);
    await pheDuyetKetQua(khoa.id, { soQuyetDinh: "QD-CTD", nguoiThucHienTen: "Lãnh đạo" });
    expect((await cauHinhDiemThiCuaKhoa(khoa.id)).nguon).toBe("KHOA");
    // chương trình đổi sau phê duyệt không ảnh hưởng khóa
    await luuCauHinhChuongTrinh(ct.id, { thanhPhans: [{ ma: "ly-thuyet", ten: "Lý thuyết" }, { ma: "thuc-hanh", ten: "Thực hành", diemDat: 3 }] }, NGUOI);
    const kq = await prisma.ketQuaKhoa.findFirstOrThrow({ where: { khoaId: khoa.id } });
    expect(kq.datHocTap).toBe(false);
    await phucKhaoDiemThanhPhan(kq.id, { ...NGUOI, diem: { "ly-thuyet": 6, "thuc-hanh": 5.5 }, soQuyetDinhPhucKhao: "PK-1" });
    expect(await prisma.ketQuaKhoa.findUniqueOrThrow({ where: { id: kq.id } })).toMatchObject({ datHocTap: true, hoanThanh: true });

    const b = await taoKhoa(["Đỗ Dung"]);
    await luuCauHinhChuongTrinh(b.ct.id, { thanhPhans: [{ ten: "Điểm thi" }] }, NGUOI);
    await nhapDiemThanhPhan(b.khoa.id, [{ hocVienId: b.ds[0].hocVienId, diem: { "diem-thi": 7 } }], NGUOI);
    expect(await prisma.ketQuaKhoa.findFirstOrThrow({ where: { khoaId: b.khoa.id } })).toMatchObject({ datHocTap: null, hoanThanh: null });
    await expect(pheDuyetKetQua(b.khoa.id, { soQuyetDinh: "QD-X", nguoiThucHienTen: "Lãnh đạo" })).rejects.toThrow(/không phê duyệt/);

    const c = await taoKhoa(["Phạm Em"]);
    await luuCauHinhChuongTrinh(c.ct.id, { thanhPhans: [] }, NGUOI);
    await expect(nhapDiemThanhPhan(c.khoa.id, [{ hocVienId: c.ds[0].hocVienId, diem: {} }], NGUOI)).rejects.toThrow(/không nhập điểm/);
  });

  it("tệp danh sách phòng thi có 1 cột mỗi điểm thành phần, nhập lại được (ô trống giữ nguyên)", async () => {
    const { ct, khoa, ds } = await taoKhoa(["Võ Giang", "Hồ Hạnh"]);
    await luuCauHinhChuongTrinh(ct.id, LT_TH_HE_SO, NGUOI);
    await nhapDiemThanhPhan(khoa.id, [{ hocVienId: ds[0].hocVienId, diem: { "ly-thuyet": 5, "thuc-hanh": null } }], NGUOI);
    const dot = await taoDotThi(khoa.id, { ten: "Đợt", loai: "THI" }, NGUOI);
    await themPhongThi(dot.id, { sucChua: 10 }, 1, NGUOI);
    await xepPhongThi(dot.id, NGUOI);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await xuatExcelPhongThi(dot.id)).noiDung as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Phòng thi 01")!;
    let h = 0;
    ws.eachRow((r, n) => {
      if (r.getCell(1).value === "STT") h = n;
    });
    const tieuDe = (ws.getRow(h).values as unknown[]).slice(1);
    expect(tieuDe).toEqual(expect.arrayContaining(["Lý thuyết", "Thực hành"]));
    const [cLt, cTh, cTen] = ["Lý thuyết", "Thực hành", "Họ và tên"].map((t) => tieuDe.indexOf(t) + 1);
    for (let r = h + 1; r <= ws.rowCount; r++) {
      const ten = String(ws.getRow(r).getCell(cTen).value ?? "");
      if (ten === "Võ Giang") {
        expect(ws.getRow(r).getCell(cLt).value).toBe(5); // điền sẵn điểm đã nhập
        ws.getRow(r).getCell(cTh).value = "7,5";
      }
      if (ten === "Hồ Hạnh") {
        ws.getRow(r).getCell(cLt).value = 9;
        ws.getRow(r).getCell(cTh).value = 9;
      }
    }
    const kq = await nhapDiemThiTuTep(khoa.id, Buffer.from(await wb.xlsx.writeBuffer()), "diem.xlsx", NGUOI);
    expect(kq.soNhap).toBe(2);
    const dsKq = Object.fromEntries((await prisma.ketQuaKhoa.findMany({ where: { khoaId: khoa.id } })).map((k) => [k.hocVienId, [k.diemThanhPhan, Number(k.diemTongKet), k.datHocTap]]));
    expect(dsKq[ds[0].hocVienId]).toEqual([{ "ly-thuyet": 5, "thuc-hanh": 7.5 }, 6.5, true]);
    expect(dsKq[ds[1].hocVienId]).toEqual([{ "ly-thuyet": 9, "thuc-hanh": 9 }, 9, true]);
  });
});

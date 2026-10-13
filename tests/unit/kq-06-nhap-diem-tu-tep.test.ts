import { afterAll, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import { taoDotThi, themPhongThi, xepPhongThi, xuatExcelPhongThi } from "@/server/services/kh/kh-03-phong-thi";
import { nhapDiemThiTuTep } from "@/server/services/kq/kq-06-nhap-diem-tu-tep";
import { TepDiemThiCoLoiError, TepDiemThiKhongHopLeError } from "@/server/services/kq/loi-ket-qua";

// (bổ sung 13/10/2026 - KQ-06) nhập điểm thi từ tệp danh sách phòng thi đã ghi điểm

const NGUOI = { nguoiThucHienTen: "Cán bộ test nhập điểm" };
const loaiHinh: string[] = [];
const chuongTrinh: string[] = [];
const khoaIds: string[] = [];
const hocVienIds: string[] = [];

afterAll(async () => {
  await prisma.ketQuaKhoa.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dotThi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinh } } });
});

async function khoaCoPhongThi(dsTen: string[]) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_ND_${crypto.randomUUID()}`, ten: "LH nhập điểm" } });
  loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: { maCT: `CT_ND_${crypto.randomUUID()}`, ten: "Thi tin học", loaiHinhBoiDuongId: lh.id, trangThai: "DA_BAN_HANH", phuongThucDangKys: ["CHI_DU_THI"] },
  });
  chuongTrinh.push(ct.id);
  const khoa = await prisma.khoa.create({ data: { maKhoa: `KHND${crypto.randomUUID().slice(0, 8)}`, chuongTrinhId: ct.id, siSoToiDa: 50 } });
  khoaIds.push(khoa.id);
  const ds = [];
  for (const hoTen of dsTen) {
    const hv = await prisma.hocVien.create({ data: { maHocVien: `HVND${crypto.randomUUID().slice(0, 10)}`, hoTen } });
    hocVienIds.push(hv.id);
    ds.push(await prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId: khoa.id, trangThai: "CHINH_THUC", phuongThuc: "CHI_DU_THI" }, include: { hocVien: true } }));
  }
  const dot = await taoDotThi(khoa.id, { ten: "Đợt thi", loai: "THI" }, NGUOI);
  await themPhongThi(dot.id, { sucChua: 2 }, 2, NGUOI);
  await xepPhongThi(dot.id, NGUOI);
  return { khoa, ds, dot };
}

/** Tải tệp danh sách phòng thi, ghi điểm theo họ tên vào cột Điểm thi, trả về tệp mới. */
async function ghiDiem(dotThiId: string, diem: Record<string, string | number>) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await xuatExcelPhongThi(dotThiId)).noiDung as unknown as ArrayBuffer);
  for (const ws of wb.worksheets) {
    let cotTen = 0;
    let cotDiem = 0;
    ws.eachRow((r) => {
      r.eachCell((o, c) => {
        if (o.value === "Họ và tên") cotTen = c;
        if (o.value === "Điểm thi") cotDiem = c;
      });
      const ten = cotTen ? String(r.getCell(cotTen).value ?? "") : "";
      if (cotDiem && ten in diem) r.getCell(cotDiem).value = diem[ten];
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const diemCua = async (khoaId: string) =>
  Object.fromEntries(
    (await prisma.ketQuaKhoa.findMany({ where: { khoaId }, include: { hocVien: true } })).map((k) => [k.hocVien.hoTen, k.diemTongKet == null ? null : Number(k.diemTongKet)]),
  );

describe("KQ-06 nhập điểm thi từ tệp danh sách phòng thi", () => {
  it("tệp xuất có cột Mã hồ sơ + Điểm thi ở mỗi phòng; nhập điểm mọi phòng, nhận dấu phẩy, ô trống giữ nguyên", async () => {
    const { khoa, dot } = await khoaCoPhongThi(["Nguyễn Văn An", "Lê Thị Bình", "Trần Công Dũng"]);
    const kq = await nhapDiemThiTuTep(khoa.id, await ghiDiem(dot.id, { "Nguyễn Văn An": 8.5, "Lê Thị Bình": "7,25", "Trần Công Dũng": 6 }), "diem.xlsx", NGUOI);
    expect(kq).toEqual({ soNhap: 3, soDeTrong: 0, soSheet: 2 });
    expect(await diemCua(khoa.id)).toEqual({ "Nguyễn Văn An": 8.5, "Lê Thị Bình": 7.25, "Trần Công Dũng": 6 });

    // tải lại tệp: điểm đã nhập được điền sẵn; xóa trống 1 ô -> giữ nguyên điểm cũ
    const kq2 = await nhapDiemThiTuTep(khoa.id, await ghiDiem(dot.id, { "Nguyễn Văn An": 9, "Lê Thị Bình": "" }), "diem.xlsx", NGUOI);
    expect(kq2).toMatchObject({ soNhap: 2, soDeTrong: 1 });
    expect(await diemCua(khoa.id)).toEqual({ "Nguyễn Văn An": 9, "Lê Thị Bình": 7.25, "Trần Công Dũng": 6 });

    // (sửa 13/10/2026) lưu điểm là xác định luôn Đạt/Không đạt và hoàn thành - không cần bước xét điều kiện
    // (bổ sung 13/10/2026) điểm làm tròn 2 chữ số thập phân
    await nhapDiemThiTuTep(khoa.id, await ghiDiem(dot.id, { "Nguyễn Văn An": "8,456" }), "diem.xlsx", NGUOI);
    expect((await diemCua(khoa.id))["Nguyễn Văn An"]).toBe(8.46);
    await nhapDiemThiTuTep(khoa.id, await ghiDiem(dot.id, { "Trần Công Dũng": 3 }), "diem.xlsx", NGUOI);
    const kq3 = await prisma.ketQuaKhoa.findMany({ where: { khoaId: khoa.id }, include: { hocVien: true } });
    expect(Object.fromEntries(kq3.map((k) => [k.hocVien.hoTen, [k.datHocTap, k.hoanThanh, k.duDieuKienHocPhi]]))).toEqual({
      "Nguyễn Văn An": [true, true, true],
      "Lê Thị Bình": [true, true, true],
      "Trần Công Dũng": [false, false, true],
    });
  });

  it("điểm sai là dòng lỗi (không nhập dòng nào); tệp khóa khác hoặc không có cột Điểm thi bị từ chối", async () => {
    const a = await khoaCoPhongThi(["Phạm Thu Hà", "Võ Minh Khôi"]);
    const loi = await nhapDiemThiTuTep(a.khoa.id, await ghiDiem(a.dot.id, { "Phạm Thu Hà": 11, "Võ Minh Khôi": 8 }), "diem.xlsx", NGUOI).catch((e) => e);
    expect(loi).toBeInstanceOf(TepDiemThiCoLoiError);
    expect((loi as TepDiemThiCoLoiError).cacDongLoi).toEqual([{ dong: expect.stringMatching(/Phòng thi 01 - dòng \d+/), loi: expect.stringMatching(/Phạm Thu Hà.*0-10/) }]);
    expect(await diemCua(a.khoa.id)).toEqual({});

    const b = await khoaCoPhongThi(["Đỗ Văn Nam"]);
    await expect(nhapDiemThiTuTep(a.khoa.id, await ghiDiem(b.dot.id, { "Đỗ Văn Nam": 5 }), "diem.xlsx", NGUOI)).rejects.toThrow(/khóa/);

    const on = await taoDotThi(a.khoa.id, { ten: "Lớp ôn", loai: "ON_THI" }, NGUOI);
    await themPhongThi(on.id, { sucChua: 5 }, 1, NGUOI);
    await xepPhongThi(on.id, NGUOI);
    await expect(nhapDiemThiTuTep(a.khoa.id, (await xuatExcelPhongThi(on.id)).noiDung, "on.xlsx", NGUOI)).rejects.toThrow(TepDiemThiKhongHopLeError);
  });
});

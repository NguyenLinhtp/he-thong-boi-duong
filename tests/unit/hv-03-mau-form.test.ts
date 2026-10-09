import { afterAll, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import { importDanhSachHocVien, mauExcelImportKhoa } from "@/server/services/hv/hv-03-import-danh-sach";
import { DuLieuImportLoiError } from "@/server/services/hv/loi-hoc-vien";
import { CAU_HINH_MAC_DINH, type TruongForm } from "@/lib/form-dang-ky";

// (bổ sung 08/10/2026 - HV-03) tệp mẫu + nạp danh sách được cử đi học theo form đăng ký của khóa

const loaiHinh: string[] = [];
const chuongTrinh: string[] = [];
const khoaIds: string[] = [];
const chucDanhIds: string[] = [];

afterAll(async () => {
  const dk = await prisma.dangKyHoc.findMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: dk.map((d) => d.hocVienId) } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinh } } });
  await prisma.chucDanhHocVi.deleteMany({ where: { id: { in: chucDanhIds } } });
});

const cccd12 = () => `0${String(Math.floor(Math.random() * 1e11)).padStart(11, "0")}`;
const tuyChinh = (ma: string, nhan: string, kieu: TruongForm["kieu"], them: Partial<TruongForm> = {}): TruongForm => ({
  ma,
  nhan,
  kieu,
  coSan: false,
  hien: true,
  batBuoc: false,
  luaChon: [],
  macDinh: null,
  coDinh: false,
  goiY: null,
  ...them,
});

async function taoKhoa() {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_MF_${crypto.randomUUID()}`, ten: "LH" } });
  loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_MF_${crypto.randomUUID()}`,
      ten: "CT mẫu form",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      phuongThucDangKys: ["IMPORT_TU_XAC_NHAN", "TRUC_TUYEN_NOP_GIAY"],
    },
  });
  chuongTrinh.push(ct.id);
  const cd = await prisma.chucDanhHocVi.create({ data: { ma: `CD_MF_${crypto.randomUUID().slice(0, 8)}`, ten: `Giáo viên hạng II ${crypto.randomUUID().slice(0, 4)}`, loai: "chuc_danh" } });
  chucDanhIds.push(cd.id);
  const truong = [
    ...CAU_HINH_MAC_DINH.truong.map((t) =>
      t.ma === "ngaySinh" ? { ...t, batBuoc: true } : t.ma === "chucDanhHocViId" ? { ...t, hien: true } : t,
    ),
    tuyChinh("tcmonday", "Môn dạy", "LUA_CHON", { luaChon: ["Toán", "Ngữ văn"], batBuoc: true }),
    tuyChinh("tcsonam", "Số năm công tác", "SO"),
    tuyChinh("tcqd", "Quyết định cử đi học", "TEP", { batBuoc: true }),
    tuyChinh("tccodinh", "Hình thức", "VAN_BAN", { macDinh: "Tập trung", coDinh: true }),
  ];
  const khoa = await prisma.khoa.create({
    data: {
      maKhoa: `KHMF${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      chuongTrinhId: ct.id,
      siSoToiDa: 20,
      trangThai: "DANG_TUYEN_SINH",
      cauHinhFormDangKy: { dinhDanh: "CCCD", truong },
    },
  });
  khoaIds.push(khoa.id);
  return { khoa, cd };
}

/** Điền dữ liệu vào tệp mẫu tải về rồi xuất lại thành Buffer (.xlsx) như cán bộ làm. */
async function dienMau(khoaId: string, dong: Record<string, string>[]) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await mauExcelImportKhoa(khoaId)) as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  let hangTieuDe = 0;
  ws.eachRow((r, i) => {
    if (!hangTieuDe && String(r.getCell(1).value ?? "").startsWith("Họ và tên")) hangTieuDe = i;
  });
  const tieuDe = (ws.getRow(hangTieuDe).values as unknown[]).slice(1).map((v) => String(v ?? ""));
  dong.forEach((d, k) => {
    const r = ws.getRow(hangTieuDe + 1 + k);
    tieuDe.forEach((t, i) => {
      const khoa = Object.keys(d).find((x) => t.startsWith(x));
      if (khoa) r.getCell(i + 1).value = d[khoa];
    });
  });
  return { buf: Buffer.from(await wb.xlsx.writeBuffer()), tieuDe, ws };
}

describe("HV-03 tệp mẫu theo form đăng ký của khóa", () => {
  it("cột = Họ và tên, Số CCCD + trường đang hiện của form (đánh dấu (*) bắt buộc); bỏ tệp minh chứng và trường cố định; có danh sách chọn", async () => {
    const { khoa, cd } = await taoKhoa();
    const { tieuDe, ws } = await dienMau(khoa.id, []);
    expect(tieuDe).toEqual([
      "Họ và tên (*)",
      "Số CCCD/hộ chiếu (*)",
      "Ngày sinh (*)",
      "Số điện thoại",
      "Email",
      "Đơn vị công tác",
      "Chức danh, học hàm/học vị",
      "Môn dạy (*)",
      "Số năm công tác",
    ]);
    const tren = ws.getRow(1).getCell(1).value;
    expect(String(tren)).toContain("DANH SÁCH");
    let coMaKhoa = false;
    ws.eachRow((r) => {
      if (String(r.getCell(1).value ?? "").includes(`Mã khóa: ${khoa.maKhoa}`)) coMaKhoa = true;
    });
    expect(coMaKhoa).toBe(true);
    // ô dữ liệu của cột chọn có danh sách thả xuống
    const hang = ws.getRow(7);
    expect(JSON.stringify(hang.getCell(8).dataValidation)).toContain("Toán,Ngữ văn");
    expect(JSON.stringify(hang.getCell(7).dataValidation)).toContain(cd.ten);
  });
});

describe("HV-03 nạp danh sách theo form đăng ký", () => {
  it("nạp tệp mẫu đã điền: trường có sẵn vào hồ sơ, trường tùy chỉnh lưu kèm hồ sơ đăng ký; ngày dd/mm/yyyy, chọn không phân biệt hoa thường, chức danh theo tên", async () => {
    const { khoa, cd } = await taoKhoa();
    const so = cccd12();
    const { buf } = await dienMau(khoa.id, [
      {
        "Họ và tên": "Nguyễn Thị Lan",
        "Số CCCD": ` ${so.slice(1)} `,
        "Ngày sinh": "05/09/1985",
        Email: "Lan.Nguyen@Gmail.com",
        "Đơn vị công tác": "Trường THCS A",
        "Chức danh": cd.ten.toUpperCase(),
        "Môn dạy": "ngữ văn",
        "Số năm công tác": "12",
      },
      // bắt buộc của form để trống vẫn nhận (học viên bổ sung khi xác nhận)
      { "Họ và tên": "Trần Văn Bình", "Số CCCD": cccd12() },
    ]);
    const ds = await importDanhSachHocVien(khoa.id, buf, "mau.xlsx");
    expect(ds).toHaveLength(2);
    const lan = await prisma.dangKyHoc.findFirstOrThrow({ where: { khoaId: khoa.id, hocVien: { hoTen: "Nguyễn Thị Lan" } }, include: { hocVien: true } });
    expect(lan.trangThai).toBe("CHO_TU_XAC_NHAN");
    expect(lan.hocVien.soCCCD).toBe(so);
    expect(lan.hocVien.ngaySinh?.toISOString().slice(0, 10)).toBe("1985-09-05");
    expect(lan.hocVien.email).toBe("lan.nguyen@gmail.com");
    expect(lan.hocVien.chucDanhHocViId).toBe(cd.id);
    expect(lan.thongTinBoSung).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ma: "tcmonday", giaTri: "Ngữ văn" }),
        expect.objectContaining({ ma: "tcsonam", giaTri: "12" }),
        // trường cố định ghi giá trị cấu hình
        expect.objectContaining({ ma: "tccodinh", giaTri: "Tập trung" }),
      ]),
    );
  });

  it("chặn cả tệp khi có dòng sai: ngày sai dạng, giá trị ngoài danh sách chọn, email sai, số không hợp lệ, chức danh không có trong danh mục", async () => {
    const { khoa } = await taoKhoa();
    const { buf } = await dienMau(khoa.id, [
      { "Họ và tên": "Đúng", "Số CCCD": cccd12() },
      { "Họ và tên": "A", "Số CCCD": cccd12(), "Ngày sinh": "31/31/1990" },
      { "Họ và tên": "B", "Số CCCD": cccd12(), "Môn dạy": "Hóa học" },
      { "Họ và tên": "C", "Số CCCD": cccd12(), Email: "c@gmail" },
      { "Họ và tên": "D", "Số CCCD": cccd12(), "Số năm công tác": "mười" },
      { "Họ và tên": "E", "Số CCCD": cccd12(), "Chức danh": "Không có" },
    ]);
    const loi = await importDanhSachHocVien(khoa.id, buf, "mau.xlsx").catch((e) => e);
    expect(loi).toBeInstanceOf(DuLieuImportLoiError);
    const ds = (loi as DuLieuImportLoiError).cacDongLoi.map((l) => l.loi);
    expect(ds).toHaveLength(5);
    expect(ds[0]).toMatch(/Ngày sinh/);
    expect(ds[1]).toMatch(/Môn dạy.*danh sách chọn/);
    expect(ds[2]).toMatch(/email/);
    expect(ds[3]).toMatch(/phải là số/);
    expect(ds[4]).toMatch(/không có trong danh mục/);
    expect(await prisma.dangKyHoc.count({ where: { khoaId: khoa.id } })).toBe(0);
  });

  it("chặn tệp mẫu của khóa khác và tệp không có cột Họ và tên/Số CCCD", async () => {
    const a = await taoKhoa();
    const b = await taoKhoa();
    const { buf } = await dienMau(a.khoa.id, [{ "Họ và tên": "X", "Số CCCD": cccd12() }]);
    await expect(importDanhSachHocVien(b.khoa.id, buf, "mau.xlsx")).rejects.toThrow(DuLieuImportLoiError);
    const loi = await importDanhSachHocVien(b.khoa.id, "Ten,So dien thoai\nA,0905000000", "x.csv").catch((e) => e);
    expect((loi as DuLieuImportLoiError).cacDongLoi[0].loi).toMatch(/Họ và tên và Số CCCD/);
    expect(await prisma.dangKyHoc.count({ where: { khoaId: { in: [a.khoa.id, b.khoa.id] } } })).toBe(0);
  });
});

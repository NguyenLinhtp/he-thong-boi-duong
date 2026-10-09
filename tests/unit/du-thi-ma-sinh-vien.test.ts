import ExcelJS from "exceljs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa, coTheNhanDangKy, datHanDangKy } from "@/server/services/kh/kh-05-trang-thai-si-so";
import {
  importDanhSachSinhVien,
  kiemTraImportSinhVien,
  chuanHoaCCCD,
  chuanHoaSoDinhDanh,
  layCotBoSungSinhVien,
  luuCotBoSungSinhVien,
  mauExcelSinhVien,
  THAM_SO_COT_BO_SUNG,
} from "@/server/services/hv/hv-03-danh-sach-sinh-vien";
import {
  chuanHoaSoDienThoai,
  dangKyDuThi,
  nopMinhChungLePhi,
  thongTinLePhiDuThi,
  timLaiDonDuThi,
  traCuuSinhVienDuThi,
} from "@/server/services/hv/hv-05-dang-ky-du-thi";
import { luuCauHinhChuongTrinh } from "@/server/services/hv/form-dang-ky";
import { nhapExcelDoiSoat, xuatExcelDoiSoat } from "@/server/services/hp/hp-02-doi-soat-excel";
import { chotDanhSachDuThi, xuatDanhSachChinhThucDuThi } from "@/server/services/hv/hv-07-chot-danh-sach-du-thi";
import { thietLapHocPhi } from "@/server/services/hp/hp-01-thiet-lap";
import { LePhiTuDoKhongApDungError, ThieuLyDoDieuChinhHocPhiError } from "@/server/services/hp/loi-hoc-phi";
import { xoaTep } from "@/server/services/gd/luu-tru-hoc-lieu";
import { chuoiVietQR, crc16 } from "@/lib/viet-qr";
import {
  CanXacNhanGhiDeSinhVienError,
  CauHinhCotSinhVienKhongHopLeError,
  CauHinhFormKhongHopLeError,
  ChotDanhSachDuThiError,
  DaDangKyDuThiKhacSoDienThoaiError,
  KhongTimThayDangKyError,
  SoDienThoaiXacThucKhongHopLeError,
  DaDangKyKhoaNayError,
  DuLieuImportLoiError,
  NopMinhChungLePhiError,
  SinhVienKhongCoTrongDanhSachError,
  LaSinhVienCuaTruongError,
  ThongTinDangKyKhongHopLeError,
} from "@/server/services/hv/loi-hoc-vien";

const NGUOI = { nguoiThucHienTen: "Test dự thi mã SV" };
const loaiHinh: string[] = [];
const chuongTrinh: string[] = [];
const khoaIds: string[] = [];
const maSvTao: string[] = [];

const so = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
const taoSv = () => {
  // chữ số thứ 2 khác 0: Number(cccd) chỉ mất đúng 1 số 0 đầu (giống Excel)
  const sv = { ma: `T${so(9)}`, cccd: `0${1 + Math.floor(Math.random() * 9)}${so(10)}` };
  maSvTao.push(sv.ma);
  return sv;
};

// cột bổ sung danh sách sinh viên là cấu hình dùng chung toàn trường (cán bộ có thể đã khai báo cột
// bắt buộc trên giao diện) - các tệp mẫu trong test chỉ có 4 cột cố định: tạm bỏ cấu hình, trả lại sau khi chạy
let cotBoSungBanDau: string | null = null;
beforeAll(async () => {
  cotBoSungBanDau = (await prisma.thamSoHeThong.findUnique({ where: { ma: THAM_SO_COT_BO_SUNG } }))?.giaTri ?? null;
  await prisma.thamSoHeThong.deleteMany({ where: { ma: THAM_SO_COT_BO_SUNG } });
});

afterAll(async () => {
  if (cotBoSungBanDau !== null) {
    await prisma.thamSoHeThong.upsert({
      where: { ma: THAM_SO_COT_BO_SUNG },
      create: { ma: THAM_SO_COT_BO_SUNG, giaTri: cotBoSungBanDau },
      update: { giaTri: cotBoSungBanDau },
    });
  }
  const tep = await prisma.tepHoSoDangKy.findMany({ where: { dangKy: { khoaId: { in: khoaIds } } } });
  for (const t of tep) await xoaTep(t.khoaLuuTru);
  const dk = await prisma.dangKyHoc.findMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.phieuThu.deleteMany({ where: { hocPhi: { khoaId: { in: khoaIds } } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.thongBao.deleteMany({ where: { hocVienId: { in: dk.map((d) => d.hocVienId) } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: dk.map((d) => d.hocVienId) }, dangKys: { none: {} } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinh } } });
  await prisma.sinhVien.deleteMany({ where: { maSinhVien: { in: maSvTao } } });
});

async function taoKhoaDuThi(phuongThuc: "CHI_DU_THI" | "TRUC_TUYEN_NOP_GIAY" = "CHI_DU_THI", lePhi: number | null = 500000) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_DT_${crypto.randomUUID()}`, ten: "LH dự thi" } });
  loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_DT_${crypto.randomUUID()}`,
      ten: "Thi thử nghiệm",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD",
      ngayBanHanh: new Date(),
      phuongThucDangKys: phuongThuc ? [phuongThuc] : [],
    },
  });
  chuongTrinh.push(ct.id);
  if (phuongThuc === "CHI_DU_THI") {
    await luuCauHinhChuongTrinh(ct.id, { dinhDanh: "MA_SINH_VIEN", truong: [{ ma: "soDienThoai", hien: true, batBuoc: true }] }, NGUOI);
  }
  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 10, mucHocPhi: lePhi });
  khoaIds.push(khoa.id);
  await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
  return { ct, khoa };
}

async function xlsx(dong: (string | number)[][]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("A");
  for (const d of dong) ws.addRow(d);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function napSv(...ds: { ma: string; cccd: string }[]) {
  await importDanhSachSinhVien(
    await xlsx([["Mã sinh viên", "Số CCCD", "Họ tên sinh viên", "Lớp sinh hoạt"], ...ds.map((s, i) => [s.ma, s.cccd, `Sinh Viên ${i}`, "22SGT"])]),
    "ds.xlsx",
    NGUOI,
  );
}

const dangKy = (khoaId: string, sv: { ma: string; cccd: string }, them: Record<string, unknown> = {}) =>
  dangKyDuThi({
    khoaId,
    // (sửa 07/10/2026) form gửi họ tên/CCCD trống khi thí sinh không sửa thông tin tự điền
    hoTen: "",
    soCCCD: "",
    maSinhVien: sv.ma,
    duLieuForm: { giaTri: { soDienThoai: "0905000111" }, tep: {} },
    ...them,
  });

describe("Số điện thoại xác thực (sửa 05/10/2026)", () => {
  it("chuẩn hóa về 10 số bắt đầu bằng 0; sai định dạng trả về null", () => {
    expect(chuanHoaSoDienThoai(" 0905.123-456 ")).toBe("0905123456");
    expect(chuanHoaSoDienThoai("+84905123456")).toBe("0905123456");
    expect(chuanHoaSoDienThoai("84905123456")).toBe("0905123456");
    expect(chuanHoaSoDienThoai("090512345")).toBeNull();
    expect(chuanHoaSoDienThoai("1905123456")).toBeNull();
    expect(chuanHoaSoDienThoai(null)).toBeNull();
  });
});

describe("VietQR (bổ sung 01/10/2026)", () => {
  it("CRC16-CCITT-FALSE đúng chuẩn và chuỗi QR có tài khoản, số tiền, nội dung không dấu", () => {
    expect(crc16("123456789")).toBe("29B1");
    const s = chuoiVietQR({ maBin: "970415", soTaiKhoan: "0123456789", soTien: 500000, noiDung: "KH2026010 Thi đợt 1" });
    expect(s).toContain("0010A000000727");
    expect(s).toContain("5406500000");
    expect(s).toContain("KH2026010 Thi dot 1");
    expect(s.slice(-4)).toBe(crc16(s.slice(0, -4)));
  });
});

describe("HV-03 bổ sung - import danh sách sinh viên", () => {
  it("nạp mới; tệp bổ sung chỉ thêm mã SV mới, dòng trùng y hệt bỏ qua; CCCD Excel mất số 0 đầu được bù", async () => {
    const a = taoSv();
    const b = taoSv();
    const kq = await importDanhSachSinhVien(
      await xlsx([["Lớp sinh hoạt", "Họ tên sinh viên", "Mã SV", "Số CCCD"], ["22SGT", "Nguyễn A", a.ma, a.cccd], ["22SGT", "Trần B", b.ma, a.cccd.replace(/^0/, "9")]]),
      "ds.xlsx",
      NGUOI,
    );
    expect(kq).toEqual({ themMoi: 2, ghiDe: 0, khongDoi: 0 });
    // tệp bổ sung: a trùng y hệt (CCCD dạng số mất số 0 đầu) + 1 sinh viên mới -> không cần xác nhận
    const c = taoSv();
    const kq2 = await importDanhSachSinhVien(
      await xlsx([["Mã sinh viên", "Số CCCD", "Họ tên", "Lớp"], [a.ma, Number(a.cccd), "Nguyễn A", "22SGT"], [c.ma, c.cccd, "Lê C", "23SGT"]]),
      "bo-sung.xlsx",
      NGUOI,
    );
    expect(kq2).toEqual({ themMoi: 1, ghiDe: 0, khongDoi: 1 });
    expect(await prisma.sinhVien.findUnique({ where: { maSinhVien: c.ma } })).toMatchObject({ hoTen: "Lê C" });
    expect(chuanHoaCCCD("48203000001")).toBe("048203000001");
  });

  it("(sửa 05/10/2026) mã SV đã có với dữ liệu khác: kiểm tra báo cảnh báo ghi đè (cũ/mới), chưa xác nhận thì không nạp dòng nào; xác nhận mới ghi đè", async () => {
    const a = taoSv();
    await napSv(a); // "Sinh Viên 0", 22SGT
    const moi = taoSv();
    const tep = await xlsx([["Mã sinh viên", "Số CCCD", "Họ tên", "Lớp"], [moi.ma, moi.cccd, "Mới Tinh", "24SGT"], [a.ma, a.cccd, "Nguyễn Văn A", "23SGT"]]);

    const kt = await kiemTraImportSinhVien(tep, "ds.xlsx");
    expect(kt).toEqual({
      themMoi: 1,
      khongDoi: 0,
      ghiDe: [
        {
          dong: 3,
          maSinhVien: a.ma,
          cu: { hoTen: "Sinh Viên 0", soCCCD: a.cccd, lopSinhHoat: "22SGT", thongTinThem: {} },
          moi: { hoTen: "Nguyễn Văn A", soCCCD: a.cccd, lopSinhHoat: "23SGT", thongTinThem: {} },
        },
      ],
    });
    // bước kiểm tra không ghi gì
    expect(await prisma.sinhVien.findUnique({ where: { maSinhVien: moi.ma } })).toBeNull();

    // chưa xác nhận (hoặc xác nhận thiếu mã) -> chặn cả tệp
    await expect(importDanhSachSinhVien(tep, "ds.xlsx", NGUOI)).rejects.toThrow(CanXacNhanGhiDeSinhVienError);
    await expect(importDanhSachSinhVien(tep, "ds.xlsx", NGUOI, ["MA_KHAC"])).rejects.toThrow(CanXacNhanGhiDeSinhVienError);
    expect(await prisma.sinhVien.findUnique({ where: { maSinhVien: moi.ma } })).toBeNull();
    expect(await prisma.sinhVien.findUnique({ where: { maSinhVien: a.ma } })).toMatchObject({ hoTen: "Sinh Viên 0", lopSinhHoat: "22SGT" });

    // cán bộ đào tạo xác nhận ghi đè
    expect(await importDanhSachSinhVien(tep, "ds.xlsx", NGUOI, [a.ma.toLowerCase()])).toEqual({ themMoi: 1, ghiDe: 1, khongDoi: 0 });
    expect(await prisma.sinhVien.findUnique({ where: { maSinhVien: a.ma } })).toMatchObject({ hoTen: "Nguyễn Văn A", lopSinhHoat: "23SGT" });
    expect(await prisma.sinhVien.findUnique({ where: { maSinhVien: moi.ma } })).toMatchObject({ hoTen: "Mới Tinh" });
  });

  it("chặn cả tệp khi có dòng lỗi: trùng mã, thiếu CCCD, thiếu tên, CCCD đã thuộc mã khác, thiếu tiêu đề", async () => {
    const a = taoSv();
    await napSv(a);
    const moi = taoSv();
    const loi = await importDanhSachSinhVien(
      await xlsx([
        ["Mã sinh viên", "Số CCCD", "Họ tên"],
        [moi.ma, moi.cccd, "Hợp lệ"],
        [moi.ma, `0${so(11)}`, "Trùng mã"],
        [taoSv().ma, "", "Thiếu CCCD"],
        [taoSv().ma, `0${so(11)}`, ""],
        [taoSv().ma, a.cccd, "CCCD của người khác"],
      ]),
      "loi.xlsx",
      NGUOI,
    ).catch((e) => e);
    expect(loi).toBeInstanceOf(DuLieuImportLoiError);
    expect((loi as DuLieuImportLoiError).cacDongLoi.map((d) => d.dong)).toEqual([3, 4, 5, 6]);
    expect(await prisma.sinhVien.findUnique({ where: { maSinhVien: moi.ma } })).toBeNull();
    await expect(importDanhSachSinhVien(await xlsx([["A", "B"], ["1", "2"]]), "x.xlsx", NGUOI)).rejects.toThrow(DuLieuImportLoiError);
    await expect(importDanhSachSinhVien(Buffer.from("x"), "x.txt", NGUOI)).rejects.toThrow(/chỉ nhận tệp/);
    // bước kiểm tra cũng báo dòng lỗi
    await expect(kiemTraImportSinhVien(await xlsx([["Mã sinh viên", "Số CCCD", "Họ tên"], [taoSv().ma, "x".repeat(31), "X"]]), "x.xlsx")).rejects.toThrow(
      DuLieuImportLoiError,
    );
  });
});

describe("HV-03 bổ sung 05/10/2026 - file mẫu thay đổi được (cột bổ sung)", () => {
  it("khai báo cột: chặn tên trống/trùng/trùng cột cố định; file mẫu có cột mới; nạp lưu giá trị, bắt buộc thì chặn; cột thiếu trong tệp giữ dữ liệu cũ", async () => {
    const cu = await prisma.thamSoHeThong.findUnique({ where: { ma: THAM_SO_COT_BO_SUNG } });
    try {
      await expect(luuCotBoSungSinhVien([{ nhan: " " }], NGUOI)).rejects.toThrow(CauHinhCotSinhVienKhongHopLeError);
      await expect(luuCotBoSungSinhVien([{ nhan: "Khoa" }, { nhan: "khoa" }], NGUOI)).rejects.toThrow(/trùng tên/);
      await expect(luuCotBoSungSinhVien([{ nhan: "Lớp chuyên ngành" }], NGUOI)).rejects.toThrow(/cột cố định/);
      await expect(luuCotBoSungSinhVien([{ nhan: "Số CCCD cũ" }], NGUOI)).rejects.toThrow(/cột cố định/);

      const ds = await luuCotBoSungSinhVien([{ nhan: "Ngày sinh", batBuoc: true }, { nhan: "Khoa" }], NGUOI);
      expect(await layCotBoSungSinhVien()).toEqual(ds);
      const [ngaySinh, khoa] = ds;
      // đổi tên giữ mã cột (dữ liệu đã nạp không mất)
      expect((await luuCotBoSungSinhVien([ngaySinh, { ...khoa, nhan: "Khoa quản lý" }], NGUOI))[1].ma).toBe(khoa.ma);

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load((await mauExcelSinhVien()) as unknown as ArrayBuffer);
      expect(wb.worksheets[0].getRow(1).values).toEqual([undefined, "Mã sinh viên", "Số CCCD", "Họ tên sinh viên", "Lớp sinh hoạt", "Ngày sinh", "Khoa quản lý"]);

      const a = taoSv();
      // thiếu cột bắt buộc trong tệp / thiếu giá trị bắt buộc -> chặn cả tệp
      const thieuCot = await importDanhSachSinhVien(await xlsx([["Mã sinh viên", "Số CCCD", "Họ tên"], [a.ma, a.cccd, "A"]]), "x.xlsx", NGUOI).catch((e) => e);
      expect((thieuCot as DuLieuImportLoiError).cacDongLoi[0].loi).toMatch(/Thiếu cột bắt buộc "Ngày sinh"/);
      const thieuGiaTri = await importDanhSachSinhVien(
        await xlsx([["Mã sinh viên", "Số CCCD", "Họ tên", "Ngày sinh"], [a.ma, a.cccd, "A", ""]]),
        "x.xlsx",
        NGUOI,
      ).catch((e) => e);
      expect((thieuGiaTri as DuLieuImportLoiError).cacDongLoi).toEqual([{ dong: 2, loi: 'Thiếu "Ngày sinh"' }]);

      await importDanhSachSinhVien(
        await xlsx([["Mã sinh viên", "Số CCCD", "Họ tên", "Lớp sinh hoạt", "Ngày sinh", "Khoa quản lý"], [a.ma, a.cccd, "A", "22SGT", "01/02/2004", "Toán"]]),
        "x.xlsx",
        NGUOI,
      );
      expect((await prisma.sinhVien.findUnique({ where: { maSinhVien: a.ma } }))?.thongTinThem).toEqual({ [ngaySinh.ma]: "01/02/2004", [khoa.ma]: "Toán" });

      // tệp chỉ đổi cột bổ sung -> cảnh báo ghi đè; cột "Khoa quản lý" không có trong tệp thì giữ nguyên
      const tep = await xlsx([["Mã sinh viên", "Số CCCD", "Họ tên", "Lớp sinh hoạt", "Ngày sinh"], [a.ma, a.cccd, "A", "22SGT", "02/02/2004"]]);
      const kt = await kiemTraImportSinhVien(tep, "x.xlsx");
      expect(kt.ghiDe[0].moi.thongTinThem).toEqual({ [ngaySinh.ma]: "02/02/2004", [khoa.ma]: "Toán" });
      await importDanhSachSinhVien(tep, "x.xlsx", NGUOI, [a.ma]);
      expect((await prisma.sinhVien.findUnique({ where: { maSinhVien: a.ma } }))?.thongTinThem).toEqual({ [ngaySinh.ma]: "02/02/2004", [khoa.ma]: "Toán" });
    } finally {
      if (cu) await prisma.thamSoHeThong.update({ where: { ma: THAM_SO_COT_BO_SUNG }, data: { giaTri: cu.giaTri } });
      else await prisma.thamSoHeThong.deleteMany({ where: { ma: THAM_SO_COT_BO_SUNG } });
    }
  });
});

describe("HV-05 bổ sung - đăng ký dự thi bằng mã sinh viên + lệ phí", () => {
  it("định danh bằng mã SV chỉ cho chương trình Phương thức 3", async () => {
    const { ct } = await taoKhoaDuThi("TRUC_TUYEN_NOP_GIAY");
    await expect(luuCauHinhChuongTrinh(ct.id, { dinhDanh: "MA_SINH_VIEN", truong: [] }, NGUOI)).rejects.toThrow(CauHinhFormKhongHopLeError);
  });

  it("tra cứu trả họ tên, lớp, số CCCD đầy đủ (sửa 07/10/2026); chặn mã không có trong danh sách, thiếu/sai định dạng số điện thoại xác thực", async () => {
    const { khoa } = await taoKhoaDuThi();
    const sv = taoSv();
    await napSv(sv);
    const tra = await traCuuSinhVienDuThi(khoa.id, sv.ma.toLowerCase());
    // (sửa 07/10/2026) hiện đầy đủ số CCCD để thí sinh kiểm tra/sửa trên form
    expect(tra).toEqual({ maSinhVien: sv.ma, hoTen: "Sinh Viên 0", lopSinhHoat: "22SGT", soCCCD: sv.cccd, dienForm: {} });
    await expect(traCuuSinhVienDuThi(khoa.id, "KHONGCO123")).rejects.toThrow(SinhVienKhongCoTrongDanhSachError);
    await expect(dangKy(khoa.id, { ma: "KHONGCO123", cccd: sv.cccd })).rejects.toThrow(SinhVienKhongCoTrongDanhSachError);
    await expect(dangKy(khoa.id, sv, { duLieuForm: { giaTri: { soDienThoai: "" }, tep: {} } })).rejects.toThrow(SoDienThoaiXacThucKhongHopLeError);
    await expect(dangKy(khoa.id, sv, { duLieuForm: { giaTri: { soDienThoai: "12345" }, tep: {} } })).rejects.toThrow(SoDienThoaiXacThucKhongHopLeError);
    expect(await prisma.dangKyHoc.count({ where: { khoaId: khoa.id } })).toBe(0);
  });

  it("đăng ký lấy họ tên/CCCD/lớp từ danh sách, phát sinh lệ phí ngay; đăng ký lại đúng SĐT trả về hồ sơ cũ, sai SĐT bị chặn", async () => {
    const { khoa } = await taoKhoaDuThi();
    const sv = taoSv();
    await napSv(sv);
    const dk = await dangKy(khoa.id, sv);
    expect(dk.hocVien).toMatchObject({ hoTen: "Sinh Viên 0", soCCCD: sv.cccd, maSinhVien: sv.ma, lopSinhHoat: "22SGT", soDienThoai: "0905000111" });
    const hp = await prisma.hocPhi.findUnique({ where: { hocVienId_khoaId: { hocVienId: dk.hocVienId, khoaId: khoa.id } } });
    expect(hp).toMatchObject({ trangThai: "CHUA_NOP" });
    expect(Number(hp!.soTienPhaiNop)).toBe(500000);
    expect(dk.soDienThoaiXacThuc).toBe("0905000111");
    const loi = await dangKy(khoa.id, sv, { duLieuForm: { giaTri: { soDienThoai: "+84 905 000 111" }, tep: {} } }).catch((e) => e);
    expect(loi).toBeInstanceOf(DaDangKyKhoaNayError);
    expect((loi as DaDangKyKhoaNayError).dangKyId).toBe(dk.id);
    // người khác biết mã SV nhưng không biết SĐT đã khai: không lấy được mã hồ sơ
    const khac = await dangKy(khoa.id, sv, { duLieuForm: { giaTri: { soDienThoai: "0988000000" }, tep: {} } }).catch((e) => e);
    expect(khac).toBeInstanceOf(DaDangKyDuThiKhacSoDienThoaiError);
    expect(await timLaiDonDuThi(khoa.id, { maSinhVien: sv.ma.toLowerCase(), soDienThoai: "0905.000.111" })).toBe(dk.id);
    await expect(timLaiDonDuThi(khoa.id, { maSinhVien: sv.ma, soDienThoai: "0988000000" })).rejects.toThrow(KhongTimThayDangKyError);
    await expect(timLaiDonDuThi(khoa.id, { maSinhVien: sv.ma, soDienThoai: "" })).rejects.toThrow(SoDienThoaiXacThucKhongHopLeError);
    // chưa cấu hình tài khoản ngân hàng thì không có QR nhưng vẫn có nội dung chuyển khoản
    const lp = await thongTinLePhiDuThi(dk.id);
    expect(lp).toMatchObject({ soTienPhaiNop: 500000, noiDung: `${khoa.maKhoa} ${sv.ma}`, daXong: false });
  });

  it("thí sinh tự do (không phải sinh viên): đăng ký đầy đủ thông tin, CCCD là khóa, không cần mã SV; mở lại đơn bằng CCCD + SĐT", async () => {
    const { khoa } = await taoKhoaDuThi();
    const cccdTuDo = `0${1 + Math.floor(Math.random() * 9)}${so(10)}`;
    const tuDo = (them: Record<string, unknown> = {}) =>
      dangKyDuThi({
        khoaId: khoa.id,
        hoTen: "Thí Sinh Tự Do",
        soCCCD: cccdTuDo,
        laThiSinhTuDo: true,
        duLieuForm: { giaTri: { soDienThoai: "0905000222" }, tep: {} },
        ...them,
      });
    // chặn: thiếu họ tên, thiếu số CCCD/hộ chiếu (sửa 07/10/2026: không bắt định dạng 12 số - nhận hộ chiếu)
    await expect(tuDo({ hoTen: " " })).rejects.toThrow(ThongTinDangKyKhongHopLeError);
    await expect(tuDo({ soCCCD: " " })).rejects.toThrow(/số CCCD\/hộ chiếu/);
    // chặn: CCCD thuộc sinh viên trong danh sách -> phải đăng ký theo diện sinh viên
    const sv = taoSv();
    await napSv(sv);
    await expect(tuDo({ soCCCD: sv.cccd })).rejects.toThrow(LaSinhVienCuaTruongError);

    const dk = await tuDo();
    expect(dk.hocVien).toMatchObject({ hoTen: "Thí Sinh Tự Do", soCCCD: cccdTuDo, maSinhVien: null, lopSinhHoat: null });
    expect(await prisma.hocPhi.count({ where: { khoaId: khoa.id, hocVienId: dk.hocVienId } })).toBe(1);
    expect(await timLaiDonDuThi(khoa.id, { soCCCD: cccdTuDo, soDienThoai: "0905000222" })).toBe(dk.id);
    await expect(timLaiDonDuThi(khoa.id, { soCCCD: cccdTuDo, soDienThoai: "0905000999" })).rejects.toThrow(KhongTimThayDangKyError);
    // đăng ký lại cùng CCCD: đúng SĐT -> mở đơn cũ; sai SĐT -> báo đã đăng ký, không lộ đơn
    expect(((await tuDo().catch((e) => e)) as DaDangKyKhoaNayError).dangKyId).toBe(dk.id);
    await expect(tuDo({ duLieuForm: { giaTri: { soDienThoai: "0905000999" }, tep: {} } })).rejects.toThrow(DaDangKyDuThiKhacSoDienThoaiError);
    // không chọn "thí sinh tự do" thì vẫn bắt buộc mã sinh viên
    await expect(dangKyDuThi({ khoaId: khoa.id, hoTen: "X", soCCCD: cccdTuDo, soDienThoai: "0905000222" })).rejects.toThrow(
      SinhVienKhongCoTrongDanhSachError,
    );
  });

  it("lệ phí theo đối tượng: sinh viên ĐHSP-ĐHĐN theo mức chung, thí sinh tự do theo mức riêng; đổi mức sau khi có đăng ký phải có lý do", async () => {
    const { khoa } = await taoKhoaDuThi();
    await thietLapHocPhi(khoa.id, { mucHocPhi: 500000, mucHocPhiTuDo: 800000 });
    const sv = taoSv();
    await napSv(sv);
    const dkSv = await dangKy(khoa.id, sv);
    const cccdTuDo = `0${1 + Math.floor(Math.random() * 9)}${so(10)}`;
    const dkTuDo = await dangKyDuThi({
      khoaId: khoa.id,
      hoTen: "Thí Sinh Lệ Phí",
      soCCCD: cccdTuDo,
      laThiSinhTuDo: true,
      duLieuForm: { giaTri: { soDienThoai: "0905000333" }, tep: {} },
    });
    const phi = async (hocVienId: string) =>
      Number((await prisma.hocPhi.findUnique({ where: { hocVienId_khoaId: { hocVienId, khoaId: khoa.id } } }))!.soTienPhaiNop);
    expect(await phi(dkSv.hocVienId)).toBe(500000);
    expect(await phi(dkTuDo.hocVienId)).toBe(800000);
    expect((await thongTinLePhiDuThi(dkTuDo.id))?.soTienPhaiNop).toBe(800000);

    // đã có đăng ký -> đổi lệ phí tự do phải có lý do; có lý do thì đồng bộ khoản chưa nộp
    await expect(thietLapHocPhi(khoa.id, { mucHocPhi: 500000, mucHocPhiTuDo: 900000 })).rejects.toThrow(ThieuLyDoDieuChinhHocPhiError);
    await thietLapHocPhi(khoa.id, { mucHocPhi: 500000, mucHocPhiTuDo: 900000, lyDoDieuChinh: "QĐ điều chỉnh lệ phí" });
    expect(await phi(dkTuDo.hocVienId)).toBe(900000);
    expect(await phi(dkSv.hocVienId)).toBe(500000);
    // bỏ mức riêng -> thí sinh tự do về như sinh viên
    await thietLapHocPhi(khoa.id, { mucHocPhi: 500000, mucHocPhiTuDo: null, lyDoDieuChinh: "Thống nhất 1 mức" });
    expect(await phi(dkTuDo.hocVienId)).toBe(500000);
  });

  it("chặn đặt lệ phí thí sinh tự do cho khóa không định danh bằng mã sinh viên", async () => {
    const { khoa } = await taoKhoaDuThi("TRUC_TUYEN_NOP_GIAY");
    await expect(thietLapHocPhi(khoa.id, { mucHocPhi: 500000, mucHocPhiTuDo: 800000 })).rejects.toThrow(LePhiTuDoKhongApDungError);
    await expect(thietLapHocPhi(khoa.id, { mucHocPhi: 500000 })).resolves.toBeTruthy();
  });

  it("hạn đăng ký: quá hạn thì đóng đăng ký", async () => {
    const { khoa } = await taoKhoaDuThi();
    expect(await coTheNhanDangKy(khoa.id)).toBe(true);
    await datHanDangKy(khoa.id, "2020-01-01", NGUOI);
    expect(await coTheNhanDangKy(khoa.id)).toBe(false);
    const sv = taoSv();
    await napSv(sv);
    await expect(dangKy(khoa.id, sv)).rejects.toThrow(/không mở đăng ký/);
    await expect(datHanDangKy(khoa.id, "01/10/2026", NGUOI)).rejects.toThrow(/không hợp lệ/);
  });

  it("minh chứng chuyển khoản: chặn sai định dạng; nộp được, nộp lại thay tệp cũ", async () => {
    const { khoa } = await taoKhoaDuThi();
    const sv = taoSv();
    await napSv(sv);
    const dk = await dangKy(khoa.id, sv);
    await expect(nopMinhChungLePhi(dk.id, { ten: "a.exe", loai: "x", noiDung: Buffer.from("x") })).rejects.toThrow(NopMinhChungLePhiError);
    await nopMinhChungLePhi(dk.id, { ten: "ck.png", loai: "image/png", noiDung: Buffer.from("png1") });
    await nopMinhChungLePhi(dk.id, { ten: "ck2.png", loai: "image/png", noiDung: Buffer.from("png2") });
    const tep = await prisma.tepHoSoDangKy.findMany({ where: { dangKyId: dk.id } });
    expect(tep.map((t) => t.tenFile)).toEqual(["ck2.png"]);
  });
});

describe("HP-02 bổ sung - đối soát lệ phí qua Excel + HV-07 chốt danh sách chính thức", () => {
  async function suaTep(tep: Buffer, trangThai: Record<string, string>) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(tep as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    ws.eachRow((row) => {
      const ma = String(row.getCell(2).value ?? "");
      if (trangThai[ma]) row.getCell(12).value = trangThai[ma];
    });
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  it("ghi nhận dòng Đã đóng (lập phiếu thu), chặn tệp của khóa khác/trạng thái lạ; chốt sau hạn: đã đóng -> chính thức, chưa đóng -> không hợp lệ", async () => {
    const { khoa } = await taoKhoaDuThi();
    const khac = await taoKhoaDuThi();
    const [a, b] = [taoSv(), taoSv()];
    await napSv(a, b);
    const dkA = await dangKy(khoa.id, a);
    const dkB = await dangKy(khoa.id, b);

    const { noiDung } = await xuatExcelDoiSoat(khoa.id);
    // trạng thái không hợp lệ -> không ghi nhận gì
    await expect(nhapExcelDoiSoat(khoa.id, await suaTep(noiDung, { [dkA.hocVien.maHocVien]: "ok rồi" }), "ds.xlsx", NGUOI)).rejects.toThrow(DuLieuImportLoiError);
    // tệp của khóa khác
    await expect(nhapExcelDoiSoat(khac.khoa.id, await suaTep(noiDung, { [dkA.hocVien.maHocVien]: "Đã đóng" }), "ds.xlsx", NGUOI)).rejects.toThrow(/khóa/);
    expect(await prisma.phieuThu.count({ where: { hocPhi: { khoaId: khoa.id } } })).toBe(0);

    // chưa hết hạn đăng ký -> chưa chốt được
    await expect(chotDanhSachDuThi(khoa.id, NGUOI)).rejects.toThrow(ChotDanhSachDuThiError);

    const kq = await nhapExcelDoiSoat(khoa.id, await suaTep(noiDung, { [dkA.hocVien.maHocVien]: "Đã đóng" }), "ds.xlsx", NGUOI);
    expect(kq.daGhiNhan.map((d) => d.maHoSo)).toEqual([dkA.hocVien.maHocVien]);
    expect(kq.chuaDong).toBe(1);
    const hpA = await prisma.hocPhi.findUnique({ where: { hocVienId_khoaId: { hocVienId: dkA.hocVienId, khoaId: khoa.id } }, include: { phieuThus: true } });
    expect(hpA).toMatchObject({ trangThai: "DA_NOP_DU" });
    expect(hpA!.phieuThus).toHaveLength(1);
    // nhập lại cùng tệp: không ghi trùng
    const lai = await nhapExcelDoiSoat(khoa.id, await suaTep(noiDung, { [dkA.hocVien.maHocVien]: "Đã đóng" }), "ds.xlsx", NGUOI);
    expect(lai).toMatchObject({ daGhiNhan: [], daCoTruoc: 1 });
    // đã xác nhận lệ phí thì không nộp minh chứng nữa
    await expect(nopMinhChungLePhi(dkA.id, { ten: "a.png", loai: "image/png", noiDung: Buffer.from("x") })).rejects.toThrow(/đã được nhà trường xác nhận/);

    await datHanDangKy(khoa.id, "2020-01-01", NGUOI);
    const chot = await chotDanhSachDuThi(khoa.id, NGUOI);
    expect(chot).toMatchObject({ chinhThuc: 1, khongHopLe: 1 });
    expect((await prisma.dangKyHoc.findUnique({ where: { id: dkA.id } }))!.trangThai).toBe("CHINH_THUC");
    expect(await prisma.dangKyHoc.findUnique({ where: { id: dkB.id } })).toMatchObject({ trangThai: "KHONG_HOP_LE", ghiChuThamDinh: expect.stringMatching(/lệ phí/) });
    expect(await prisma.hocPhi.findUnique({ where: { hocVienId_khoaId: { hocVienId: dkB.hocVienId, khoaId: khoa.id } } })).toBeNull();

    const xuat = await xuatDanhSachChinhThucDuThi(khoa.id);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(xuat.noiDung as unknown as ArrayBuffer);
    const chu = wb.worksheets[0].getSheetValues().flat().map(String).join("|");
    expect(chu).toContain(a.ma);
    expect(chu).not.toContain(b.ma);
  });

  it("chốt chặn khóa không phải Phương thức 3", async () => {
    const { khoa } = await taoKhoaDuThi("TRUC_TUYEN_NOP_GIAY");
    await expect(chotDanhSachDuThi(khoa.id, NGUOI)).rejects.toThrow(/Phương thức 3/);
  });
});

describe("(bổ sung 07/10/2026) số hộ chiếu người nước ngoài; thí sinh sửa thông tin tự điền từ danh sách", () => {
  it("nạp danh sách nhận số hộ chiếu (bỏ khoảng trắng, viết hoa); chỉ chặn khi trống/quá 30 ký tự", async () => {
    expect(chuanHoaSoDinhDanh("p 3304738")).toBe("P3304738");
    expect(chuanHoaSoDinhDanh("48203000001")).toBe("048203000001");
    expect(chuanHoaSoDinhDanh("  ")).toBeNull();
    const nn = { ma: taoSv().ma, cccd: `P ${so(7)}` };
    await napSv(nn);
    expect((await prisma.sinhVien.findUnique({ where: { maSinhVien: nn.ma } }))?.soCCCD).toBe(nn.cccd.replace(" ", ""));
  });

  it("sinh viên sửa họ tên/lớp/CCCD tự điền: hồ sơ mới dùng thông tin đã sửa, lưu chênh lệch + nhật ký; CCCD của người khác bị chặn", async () => {
    const { khoa } = await taoKhoaDuThi();
    const [sv, khac] = [taoSv(), taoSv()];
    await napSv(sv, khac);
    // CCCD sửa trùng sinh viên khác -> chặn, không tạo hồ sơ
    await expect(dangKy(khoa.id, sv, { soCCCD: khac.cccd })).rejects.toThrow(/đã gắn với thí sinh khác/);
    expect(await prisma.dangKyHoc.count({ where: { khoaId: khoa.id } })).toBe(0);

    const hoChieu = `C${so(8)}`;
    const dk = await dangKy(khoa.id, sv, { hoTen: "Sinh  Viên Đã Sửa", soCCCD: hoChieu.toLowerCase(), lopSinhHoat: "22SGT" });
    expect(dk.hocVien).toMatchObject({ hoTen: "Sinh Viên Đã Sửa", soCCCD: hoChieu, maSinhVien: sv.ma, lopSinhHoat: "22SGT" });
    expect(dk.suaThongTinDanhSach).toEqual({ hoTen: { cu: "Sinh Viên 0", moi: "Sinh Viên Đã Sửa" }, soCCCD: { cu: sv.cccd, moi: hoChieu } });
    const nk = await prisma.nhatKyThaoTac.findFirst({ where: { doiTuongId: dk.id, hanhDong: "THI_SINH_SUA_THONG_TIN_DANH_SACH" } });
    expect(nk?.chiTiet).toContain(hoChieu);
    // danh sách sinh viên của trường không bị đổi
    expect((await prisma.sinhVien.findUnique({ where: { maSinhVien: sv.ma } }))?.soCCCD).toBe(sv.cccd);
    // không sửa gì -> không lưu chênh lệch
    const { khoa: khoa2 } = await taoKhoaDuThi();
    const dk2 = await dangKy(khoa2.id, khac);
    expect(dk2.suaThongTinDanhSach).toBeNull();
  });

  it("hồ sơ học viên đã có từ trước không bị ghi đè bởi thông tin thí sinh sửa (cán bộ áp dụng ở HV-06)", async () => {
    const [{ khoa: k1 }, { khoa: k2 }] = [await taoKhoaDuThi(), await taoKhoaDuThi()];
    const sv = taoSv();
    await napSv(sv);
    const dk1 = await dangKy(k1.id, sv);
    const dk2 = await dangKy(k2.id, sv, { hoTen: "Người Khác Gõ Tên" });
    expect(dk2.hocVienId).toBe(dk1.hocVienId);
    expect(dk2.hocVien.hoTen).toBe("Sinh Viên 0");
    expect(dk2.suaThongTinDanhSach).toEqual({ hoTen: { cu: "Sinh Viên 0", moi: "Người Khác Gõ Tên" } });
    const nk = await prisma.nhatKyThaoTac.findFirst({ where: { doiTuongId: dk2.id, hanhDong: "THI_SINH_SUA_THONG_TIN_DANH_SACH" } });
    expect(nk?.chiTiet).toContain("chưa áp dụng");
  });

  it("thí sinh tự do người nước ngoài đăng ký bằng số hộ chiếu, mở lại đơn bằng số hộ chiếu + SĐT", async () => {
    const { khoa } = await taoKhoaDuThi();
    const hoChieu = `P${so(7)}`;
    const dk = await dangKyDuThi({
      khoaId: khoa.id,
      hoTen: "John Smith",
      soCCCD: `${hoChieu.slice(0, 1).toLowerCase()} ${hoChieu.slice(1)}`,
      laThiSinhTuDo: true,
      duLieuForm: { giaTri: { soDienThoai: "0905000333" }, tep: {} },
    });
    expect(dk.hocVien.soCCCD).toBe(hoChieu);
    expect(await timLaiDonDuThi(khoa.id, { soCCCD: hoChieu, soDienThoai: "0905000333" })).toBe(dk.id);
  });
});

describe("(bổ sung 07/10/2026) tra mã sinh viên điền sẵn các cột bổ sung của danh sách vào form đăng ký", () => {
  it("ghép theo tên (bỏ ghi chú trong ngoặc, không phân biệt hoa thường); ô ngày đổi về yyyy-mm-dd; danh sách chọn chỉ điền khi khớp; trường cố định không điền", async () => {
    const cu = await prisma.thamSoHeThong.findUnique({ where: { ma: THAM_SO_COT_BO_SUNG } });
    try {
      await luuCotBoSungSinhVien([{ nhan: "Nơi sinh" }, { nhan: "Ngày sinh" }, { nhan: "Giới tính" }, { nhan: "Dân tộc" }], NGUOI);
      const { ct, khoa } = await taoKhoaDuThi();
      await luuCauHinhChuongTrinh(
        ct.id,
        {
          dinhDanh: "MA_SINH_VIEN",
          truong: [
            { ma: "soDienThoai", hien: true, batBuoc: true },
            { ma: "ngaySinh", hien: true },
            { ma: "noiSinh", nhan: "Nơi sinh (tỉnh/thành phố)", kieu: "VAN_BAN", hien: true },
            { ma: "gioiTinh", nhan: "GIỚI TÍNH", kieu: "LUA_CHON", luaChon: ["Nam", "Nữ"], hien: true },
            { ma: "danToc", nhan: "Dân tộc", kieu: "VAN_BAN", hien: true, coDinh: true, macDinh: "Kinh" },
          ],
        },
        NGUOI,
      );
      const sv = taoSv();
      await importDanhSachSinhVien(
        await xlsx([
          ["Mã sinh viên", "Số CCCD", "Họ tên sinh viên", "Lớp sinh hoạt", "Nơi sinh", "Ngày sinh", "Giới tính", "Dân tộc"],
          [sv.ma, sv.cccd, "Sinh Viên Có Nơi Sinh", "22SGT", "Đà Nẵng", "26-2-2008", "nữ", "Tày"],
        ]),
        "ds.xlsx",
        NGUOI,
      );
      const tra = await traCuuSinhVienDuThi(khoa.id, sv.ma);
      expect(tra.soCCCD).toBe(sv.cccd);
      expect(tra.dienForm).toEqual({ ngaySinh: "2008-02-26", bs_noiSinh: "Đà Nẵng", bs_gioiTinh: "Nữ" });
    } finally {
      if (cu) await prisma.thamSoHeThong.update({ where: { ma: THAM_SO_COT_BO_SUNG }, data: { giaTri: cu.giaTri } });
      else await prisma.thamSoHeThong.deleteMany({ where: { ma: THAM_SO_COT_BO_SUNG } });
    }
  });
});

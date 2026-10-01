import ExcelJS from "exceljs";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa, coTheNhanDangKy, datHanDangKy } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { importDanhSachSinhVien, chuanHoaCCCD } from "@/server/services/hv/hv-03-danh-sach-sinh-vien";
import {
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
  CauHinhFormKhongHopLeError,
  ChotDanhSachDuThiError,
  DaDangKyKhoaNayError,
  DuLieuImportLoiError,
  NopMinhChungLePhiError,
  SinhVienKhongCoTrongDanhSachError,
  XacMinhSinhVienKhongKhopError,
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

afterAll(async () => {
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
      phuongThucDangKy: phuongThuc,
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
    hoTen: "Tên gõ tay bị bỏ qua",
    soCCCD: "000000000000",
    maSinhVien: sv.ma,
    cuoiCCCD: sv.cccd.slice(-4),
    duLieuForm: { giaTri: { soDienThoai: "0905000111" }, tep: {} },
    ...them,
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
  it("nạp mới rồi nạp lại thì cập nhật theo mã SV; CCCD Excel mất số 0 đầu được bù", async () => {
    const a = taoSv();
    const b = taoSv();
    const kq = await importDanhSachSinhVien(
      await xlsx([["Lớp sinh hoạt", "Họ tên sinh viên", "Mã SV", "Số CCCD"], ["22SGT", "Nguyễn A", a.ma, a.cccd], ["22SGT", "Trần B", b.ma, a.cccd.replace(/^0/, "9")]]),
      "ds.xlsx",
      NGUOI,
    );
    expect(kq).toEqual({ themMoi: 2, capNhat: 0 });
    const kq2 = await importDanhSachSinhVien(
      await xlsx([["Mã sinh viên", "Số CCCD", "Họ tên", "Lớp"], [a.ma, Number(a.cccd), "Nguyễn Văn A", "23SGT"]]),
      "ds.xlsx",
      NGUOI,
    );
    expect(kq2).toEqual({ themMoi: 0, capNhat: 1 });
    expect(await prisma.sinhVien.findUnique({ where: { maSinhVien: a.ma } })).toMatchObject({ soCCCD: a.cccd, hoTen: "Nguyễn Văn A", lopSinhHoat: "23SGT" });
    expect(chuanHoaCCCD("48203000001")).toBe("048203000001");
  });

  it("chặn cả tệp khi có dòng lỗi: trùng mã, CCCD sai, thiếu tên, CCCD đã thuộc mã khác, thiếu tiêu đề", async () => {
    const a = taoSv();
    await napSv(a);
    const moi = taoSv();
    const loi = await importDanhSachSinhVien(
      await xlsx([
        ["Mã sinh viên", "Số CCCD", "Họ tên"],
        [moi.ma, moi.cccd, "Hợp lệ"],
        [moi.ma, `0${so(11)}`, "Trùng mã"],
        [taoSv().ma, "12ab", "CCCD sai"],
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
  });
});

describe("HV-05 bổ sung - đăng ký dự thi bằng mã sinh viên + lệ phí", () => {
  it("định danh bằng mã SV chỉ cho chương trình Phương thức 3", async () => {
    const { ct } = await taoKhoaDuThi("TRUC_TUYEN_NOP_GIAY");
    await expect(luuCauHinhChuongTrinh(ct.id, { dinhDanh: "MA_SINH_VIEN", truong: [] }, NGUOI)).rejects.toThrow(CauHinhFormKhongHopLeError);
  });

  it("tra cứu không lộ CCCD; chặn mã không có trong danh sách, sai 4 số cuối CCCD", async () => {
    const { khoa } = await taoKhoaDuThi();
    const sv = taoSv();
    await napSv(sv);
    const tra = await traCuuSinhVienDuThi(khoa.id, sv.ma.toLowerCase());
    expect(tra).toEqual({ maSinhVien: sv.ma, hoTen: "Sinh Viên 0", lopSinhHoat: "22SGT" });
    expect(JSON.stringify(tra)).not.toContain(sv.cccd);
    await expect(traCuuSinhVienDuThi(khoa.id, "KHONGCO123")).rejects.toThrow(SinhVienKhongCoTrongDanhSachError);
    await expect(dangKy(khoa.id, { ma: "KHONGCO123", cccd: sv.cccd })).rejects.toThrow(SinhVienKhongCoTrongDanhSachError);
    await expect(dangKy(khoa.id, sv, { cuoiCCCD: "0000" === sv.cccd.slice(-4) ? "1111" : "0000" })).rejects.toThrow(XacMinhSinhVienKhongKhopError);
    expect(await prisma.dangKyHoc.count({ where: { khoaId: khoa.id } })).toBe(0);
  });

  it("đăng ký lấy họ tên/CCCD/lớp từ danh sách, phát sinh lệ phí ngay; đăng ký lại trả về hồ sơ cũ", async () => {
    const { khoa } = await taoKhoaDuThi();
    const sv = taoSv();
    await napSv(sv);
    const dk = await dangKy(khoa.id, sv);
    expect(dk.hocVien).toMatchObject({ hoTen: "Sinh Viên 0", soCCCD: sv.cccd, maSinhVien: sv.ma, lopSinhHoat: "22SGT", soDienThoai: "0905000111" });
    const hp = await prisma.hocPhi.findUnique({ where: { hocVienId_khoaId: { hocVienId: dk.hocVienId, khoaId: khoa.id } } });
    expect(hp).toMatchObject({ trangThai: "CHUA_NOP" });
    expect(Number(hp!.soTienPhaiNop)).toBe(500000);
    const loi = await dangKy(khoa.id, sv).catch((e) => e);
    expect(loi).toBeInstanceOf(DaDangKyKhoaNayError);
    expect((loi as DaDangKyKhoaNayError).dangKyId).toBe(dk.id);
    expect(await timLaiDonDuThi(khoa.id, { maSinhVien: sv.ma, cuoiCCCD: sv.cccd.slice(-4) })).toBe(dk.id);
    // chưa cấu hình tài khoản ngân hàng thì không có QR nhưng vẫn có nội dung chuyển khoản
    const lp = await thongTinLePhiDuThi(dk.id);
    expect(lp).toMatchObject({ soTienPhaiNop: 500000, noiDung: `${khoa.maKhoa} ${sv.ma}`, daXong: false });
  });

  it("thí sinh tự do (không phải sinh viên): đăng ký bằng họ tên + CCCD, không cần mã SV; mở lại đơn bằng CCCD + họ tên", async () => {
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
    // chặn: thiếu họ tên, CCCD sai
    await expect(tuDo({ hoTen: " " })).rejects.toThrow(ThongTinDangKyKhongHopLeError);
    await expect(tuDo({ soCCCD: "12345" })).rejects.toThrow(/CCCD không hợp lệ/);
    // chặn: CCCD thuộc sinh viên trong danh sách -> phải đăng ký theo diện sinh viên
    const sv = taoSv();
    await napSv(sv);
    await expect(tuDo({ soCCCD: sv.cccd })).rejects.toThrow(LaSinhVienCuaTruongError);

    const dk = await tuDo();
    expect(dk.hocVien).toMatchObject({ hoTen: "Thí Sinh Tự Do", soCCCD: cccdTuDo, maSinhVien: null, lopSinhHoat: null });
    expect(await prisma.hocPhi.count({ where: { khoaId: khoa.id, hocVienId: dk.hocVienId } })).toBe(1);
    expect(await timLaiDonDuThi(khoa.id, { soCCCD: cccdTuDo, hoTen: "thí sinh tự do" })).toBe(dk.id);
    await expect(timLaiDonDuThi(khoa.id, { soCCCD: cccdTuDo, hoTen: "Người Khác" })).rejects.toThrow();
    // không chọn "thí sinh tự do" thì vẫn bắt buộc mã sinh viên
    await expect(dangKyDuThi({ khoaId: khoa.id, hoTen: "X", soCCCD: cccdTuDo })).rejects.toThrow(SinhVienKhongCoTrongDanhSachError);
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

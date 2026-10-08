import ExcelJS from "exceljs";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { luuCauHinhChuongTrinh } from "@/server/services/hv/form-dang-ky";
import { importDanhSachSinhVien, layCotBoSungSinhVien } from "@/server/services/hv/hv-03-danh-sach-sinh-vien";
import { dangKyDuThi, thongTinLePhiDuThi } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import { thietLapHocPhi } from "@/server/services/hp/hp-01-thiet-lap";
import {
  danhSachTheoThanhPhan,
  doiThanhPhanDaChon,
  dsThanhPhanLePhi,
  luuThanhPhanLePhi,
  type ThanhPhanNhap,
} from "@/server/services/hp/hp-01-thanh-phan-le-phi";
import { xacNhanThanhToan } from "@/server/services/hp/hp-02-thanh-toan";
import { chuyenTrangThaiLePhi, xacNhanCacThanhPhan } from "@/server/services/hp/hp-02-chuyen-trang-thai-le-phi";
import { baoCaoDoanhThu } from "@/server/services/hp/hp-05-bao-cao";
import { nhapExcelDoiSoat, tieuDeCotThanhPhan, xuatExcelDoiSoat } from "@/server/services/hp/hp-02-doi-soat-excel";
import { DuLieuImportLoiError } from "@/server/services/hv/loi-hoc-vien";
import { daHoanTatNghiaVuTaiChinh } from "@/server/services/hp/hp-06-dieu-kien";
import { xetDuyetDanhSachChinhThuc } from "@/server/services/hv/hv-07-xet-duyet-chinh-thuc";
import { ThanhPhanLePhiKhongHopLeError, LePhiTuDoKhongApDungError } from "@/server/services/hp/loi-hoc-phi";
import { ChuaXacNhanLePhiKhiXetDuyetError } from "@/server/services/hv/loi-hoc-vien";
import { chuyenLePhiLo } from "@/server/services/hp/hp-thao-tac-lo";

// (bổ sung 06/10/2026) thành phần lệ phí động của khóa dự thi: ôn thi (tùy chọn) + thi (bắt buộc)

const NGUOI = { nguoiThucHienId: null, nguoiThucHienTen: "Test thành phần lệ phí" };
const loaiHinh: string[] = [];
const chuongTrinh: string[] = [];
const khoaIds: string[] = [];
const maSvTao: string[] = [];

afterAll(async () => {
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

const so = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

async function taoKhoa(phuongThuc: "CHI_DU_THI" | "TRUC_TUYEN_NOP_GIAY" = "CHI_DU_THI") {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_TP_${crypto.randomUUID()}`, ten: "LH thành phần" } });
  loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_TP_${crypto.randomUUID()}`,
      ten: "Thi tin học ứng dụng",
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
  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 20 });
  khoaIds.push(khoa.id);
  await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
  return khoa;
}

const THI: ThanhPhanNhap = { ten: "Đăng ký thi", batBuoc: true, mucSinhVien: 450_000, mucTuDo: 700_000 };
const ON_THI: ThanhPhanNhap = { ten: "Đăng ký ôn thi", batBuoc: false, mucSinhVien: 300_000, mucTuDo: 400_000 };

async function khoaHaiPhan() {
  const khoa = await taoKhoa();
  const ds = await luuThanhPhanLePhi(khoa.id, [ON_THI, THI], null, NGUOI);
  return { khoa, onThi: ds.find((t) => !t.batBuoc)!, thi: ds.find((t) => t.batBuoc)! };
}

async function sinhVienMoi() {
  const sv = { ma: `3199${so(6)}`, cccd: `0${so(11)}` };
  maSvTao.push(sv.ma);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("A");
  // cột bổ sung do cán bộ khai báo (HV-03, dùng chung toàn trường) - điền đủ để tệp hợp lệ
  const cotThem = await layCotBoSungSinhVien();
  ws.addRow(["Mã sinh viên", "Số CCCD", "Họ tên sinh viên", "Lớp sinh hoạt", ...cotThem.map((c) => c.nhan)]);
  ws.addRow([sv.ma, sv.cccd, "Sinh Viên Thành Phần", "22SGT", ...cotThem.map(() => "01/01/2004")]);
  await importDanhSachSinhVien(Buffer.from(await wb.xlsx.writeBuffer()), "sv.xlsx", NGUOI);
  return sv;
}

async function dangKySv(khoaId: string, dsThanhPhan: string[]) {
  const sv = await sinhVienMoi();
  return dangKyDuThi({
    khoaId,
    hoTen: "",
    maSinhVien: sv.ma,
    dsThanhPhan,
    duLieuForm: { giaTri: { soDienThoai: `09${so(8)}` }, tep: {} },
  });
}

const dangKyTuDo = (khoaId: string, dsThanhPhan: string[]) =>
  dangKyDuThi({
    khoaId,
    laThiSinhTuDo: true,
    hoTen: "Thí Sinh Tự Do",
    soCCCD: `0${so(11)}`,
    dsThanhPhan,
    duLieuForm: { giaTri: { soDienThoai: `09${so(8)}` }, tep: {} },
  });

const layHocPhi = (dk: { hocVienId: string; khoaId: string }) =>
  prisma.hocPhi.findUniqueOrThrow({
    where: { hocVienId_khoaId: { hocVienId: dk.hocVienId, khoaId: dk.khoaId } },
    include: { thanhPhans: { include: { thanhPhan: true } } },
  });

describe("HP-01 cấu hình thành phần lệ phí", () => {
  it("lưu theo thứ tự, mức khóa = tổng thành phần bắt buộc; chặn khi không có phần bắt buộc, trùng tên, mức âm, khóa không phải PT3", async () => {
    const khoa = await taoKhoa();
    const ds = await luuThanhPhanLePhi(khoa.id, [ON_THI, THI], null, NGUOI);
    expect(ds.map((t) => [t.ten, t.thuTu])).toEqual([["Đăng ký ôn thi", 0], ["Đăng ký thi", 1]]);
    const k = await prisma.khoa.findUniqueOrThrow({ where: { id: khoa.id } });
    expect([Number(k.mucHocPhi), Number(k.mucHocPhiTuDo)]).toEqual([450_000, 700_000]);

    const khac = await taoKhoa();
    await expect(luuThanhPhanLePhi(khac.id, [ON_THI], null, NGUOI)).rejects.toThrow(/ít nhất 1 thành phần bắt buộc/);
    await expect(luuThanhPhanLePhi(khac.id, [THI, { ...ON_THI, ten: " đăng ký THI " }], null, NGUOI)).rejects.toThrow(/trùng tên/);
    await expect(luuThanhPhanLePhi(khac.id, [{ ...THI, mucSinhVien: -1 }], null, NGUOI)).rejects.toThrow(ThanhPhanLePhiKhongHopLeError);
    const pt1 = await taoKhoa("TRUC_TUYEN_NOP_GIAY");
    await expect(luuThanhPhanLePhi(pt1.id, [THI], null, NGUOI)).rejects.toThrow(/Phương thức 3/);
    // khóa đã chia thành phần thì không đặt 1 mức chung
    await expect(thietLapHocPhi(khoa.id, { mucHocPhi: 500_000 })).rejects.toThrow(LePhiTuDoKhongApDungError);
  });

  it("đã có đăng ký: đổi mức cần lý do và đồng bộ phần chưa nộp; chặn thêm phần bắt buộc, đổi bắt buộc, xóa phần đã có người chọn, bỏ chế độ", async () => {
    const { khoa, onThi, thi } = await khoaHaiPhan();
    const dk = await dangKySv(khoa.id, [onThi.id]);
    const sua = [
      { id: onThi.id, ...ON_THI, mucSinhVien: 350_000 },
      { id: thi.id, ...THI },
    ];
    await expect(luuThanhPhanLePhi(khoa.id, sua, null, NGUOI)).rejects.toThrow(/lý do/);
    await luuThanhPhanLePhi(khoa.id, sua, "Điều chỉnh theo quyết định", NGUOI);
    const hp = await layHocPhi(dk);
    expect(Number(hp.soTienPhaiNop)).toBe(350_000 + 450_000);

    await expect(luuThanhPhanLePhi(khoa.id, [...sua, { ten: "Phí phúc khảo", batBuoc: true, mucSinhVien: 1, mucTuDo: null }], "x", NGUOI)).rejects.toThrow(/chỉ được là tùy chọn/);
    await expect(luuThanhPhanLePhi(khoa.id, [{ ...sua[0], batBuoc: true }, sua[1]], "x", NGUOI)).rejects.toThrow(/không đổi bắt buộc/);
    await expect(luuThanhPhanLePhi(khoa.id, [sua[1]], "x", NGUOI)).rejects.toThrow(/đã có thí sinh chọn/);
    await expect(luuThanhPhanLePhi(khoa.id, [], "x", NGUOI)).rejects.toThrow(/chuyển sang\/bỏ chế độ/);
    // thêm phần tùy chọn mới vẫn được
    const sau = await luuThanhPhanLePhi(khoa.id, [...sua, { ten: "Tài liệu ôn tập", batBuoc: false, mucSinhVien: 50_000, mucTuDo: null }], "Bổ sung tài liệu", NGUOI);
    expect(sau).toHaveLength(3);
  });
});

describe("HV-05 đăng ký chọn thành phần, đổi lựa chọn", () => {
  it("tổng lệ phí = thành phần đã chọn theo đối tượng; phần bắt buộc luôn có; id lạ thì không tạo hồ sơ", async () => {
    const { khoa, onThi, thi } = await khoaHaiPhan();
    const chiThi = await dangKySv(khoa.id, []);
    const hp1 = await layHocPhi(chiThi);
    expect(hp1.thanhPhans.map((d) => d.thanhPhanId)).toEqual([thi.id]);
    expect(Number(hp1.soTienPhaiNop)).toBe(450_000);

    const tuDoCa2 = await dangKyTuDo(khoa.id, [onThi.id, thi.id]);
    expect(Number((await layHocPhi(tuDoCa2)).soTienPhaiNop)).toBe(700_000 + 400_000);

    const truoc = await prisma.dangKyHoc.count({ where: { khoaId: khoa.id } });
    await expect(dangKySv(khoa.id, ["khong-ton-tai"])).rejects.toThrow(ThanhPhanLePhiKhongHopLeError);
    expect(await prisma.dangKyHoc.count({ where: { khoaId: khoa.id } })).toBe(truoc);

    const tt = await thongTinLePhiDuThi(tuDoCa2.id);
    expect(tt?.thanhPhan?.ds.map((t) => [t.ten, t.muc, t.daChon])).toEqual([
      ["Đăng ký ôn thi", 400_000, true],
      ["Đăng ký thi", 700_000, true],
    ]);
    expect(tt?.soTienConLai).toBe(1_100_000);
  });

  it("mở lại đơn: thêm/bỏ phần tùy chọn đến hạn đăng ký; không bỏ phần đã xác nhận, không bỏ phần bắt buộc, quá hạn thì chặn", async () => {
    const { khoa, onThi } = await khoaHaiPhan();
    const dk = await dangKySv(khoa.id, []);
    await doiThanhPhanDaChon(dk.id, [onThi.id], NGUOI);
    let hp = await layHocPhi(dk);
    expect(Number(hp.soTienPhaiNop)).toBe(750_000);

    await doiThanhPhanDaChon(dk.id, [], NGUOI);
    hp = await layHocPhi(dk);
    expect(hp.thanhPhans.map((d) => d.thanhPhan.ten)).toEqual(["Đăng ký thi"]);

    await doiThanhPhanDaChon(dk.id, [onThi.id], NGUOI);
    hp = await layHocPhi(dk);
    const dongOn = hp.thanhPhans.find((d) => d.thanhPhanId === onThi.id)!;
    await chuyenTrangThaiLePhi(hp.id, "DA_DONG", null, NGUOI, dongOn.id);
    await expect(doiThanhPhanDaChon(dk.id, [], NGUOI)).rejects.toThrow(/không bỏ được/);

    await prisma.khoa.update({ where: { id: khoa.id }, data: { hanDangKy: new Date(Date.now() - 86_400_000) } });
    await expect(doiThanhPhanDaChon(dk.id, [onThi.id], NGUOI)).rejects.toThrow(/hết hạn đăng ký/);
  });
});

describe("HP-02 xác nhận từng phần, HV-07 danh sách theo thành phần", () => {
  it("xác nhận phần thi: đủ điều kiện chính thức dù ôn thi chưa đóng; hủy phần ôn thi giữ Chính thức, hủy phần thi trả về Hợp lệ", async () => {
    const { khoa, onThi, thi } = await khoaHaiPhan();
    const dk = await dangKySv(khoa.id, [onThi.id]);
    let hp = await layHocPhi(dk);
    const dongThi = hp.thanhPhans.find((d) => d.thanhPhanId === thi.id)!;
    const dongOn = hp.thanhPhans.find((d) => d.thanhPhanId === onThi.id)!;
    await prisma.dangKyHoc.update({ where: { id: dk.id }, data: { trangThai: "HOP_LE" } });

    await expect(xetDuyetDanhSachChinhThuc(khoa.id, [dk.id], NGUOI)).rejects.toThrow(ChuaXacNhanLePhiKhiXetDuyetError);
    const kq = await chuyenTrangThaiLePhi(hp.id, "DA_DONG", null, NGUOI, dongThi.id);
    expect("phieuThu" in kq).toBe(true);
    const phieuThi = "phieuThu" in kq ? kq.phieuThu : null;
    expect(await prisma.phieuThuChiTiet.findMany({ where: { phieuThuId: phieuThi!.id } })).toMatchObject([{ hocPhiThanhPhanId: dongThi.id, noiDung: "Đăng ký thi" }]);
    hp = await layHocPhi(dk);
    expect(hp.trangThai).toBe("CON_NO");
    expect(await daHoanTatNghiaVuTaiChinh(dk.hocVienId, khoa.id)).toBe(true);
    await xetDuyetDanhSachChinhThuc(khoa.id, [dk.id], NGUOI);

    await chuyenTrangThaiLePhi(hp.id, "DA_DONG", null, NGUOI, dongOn.id);
    expect((await layHocPhi(dk)).trangThai).toBe("DA_NOP_DU");
    expect((await baoCaoDoanhThu({ khoaId: khoa.id })).tongDoanhThu).toBe(750_000);

    const huyOn = await chuyenTrangThaiLePhi(hp.id, "CHUA_DONG", "Không mở lớp ôn", NGUOI, dongOn.id);
    expect("traVeHopLe" in huyOn && huyOn.traVeHopLe).toBe(false);
    expect((await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: dk.id } })).trangThai).toBe("CHINH_THUC");
    expect((await baoCaoDoanhThu({ khoaId: khoa.id })).tongDoanhThu).toBe(450_000);

    const huyThi = await chuyenTrangThaiLePhi(hp.id, "CHUA_DONG", "Ghi nhận nhầm", NGUOI, dongThi.id);
    expect("traVeHopLe" in huyThi && huyThi.traVeHopLe).toBe(true);
    expect((await prisma.dangKyHoc.findUniqueOrThrow({ where: { id: dk.id } })).trangThai).toBe("HOP_LE");
    hp = await layHocPhi(dk);
    expect([hp.trangThai, Number(hp.soTienDaNop)]).toEqual(["CHUA_NOP", 0]);
    expect(await prisma.phieuThu.count({ where: { hocPhiId: hp.id, daHuy: true } })).toBe(2);
  });

  it("ghi thanh toán theo khoản chung: phân bổ vào phần bắt buộc trước, cả lần nộp 1 biên lai nhiều dòng; vượt số còn nợ thì chặn", async () => {
    const { khoa, onThi, thi } = await khoaHaiPhan();
    const dk = await dangKySv(khoa.id, [onThi.id]);
    const hp = await layHocPhi(dk);
    await expect(xacNhanThanhToan(hp.id, { soTien: 900_000, hinhThucNop: "Tiền mặt", nguoiXacNhanTen: "TC" })).rejects.toThrow(/vượt/);
    await xacNhanThanhToan(hp.id, { soTien: 500_000, hinhThucNop: "Tiền mặt", nguoiXacNhanTen: "TC" });
    const sau = await layHocPhi(dk);
    const theo = Object.fromEntries(sau.thanhPhans.map((d) => [d.thanhPhanId, [d.trangThai, Number(d.soTienDaNop)]]));
    expect(theo[thi.id]).toEqual(["DA_NOP_DU", 450_000]);
    expect(theo[onThi.id]).toEqual(["CON_NO", 50_000]);
    // (sửa 07/10/2026) 1 lần nộp = 1 biên lai, mỗi thành phần 1 dòng
    const dsPhieu = await prisma.phieuThu.findMany({ where: { hocPhiId: hp.id }, include: { chiTiets: true } });
    expect(dsPhieu).toHaveLength(1);
    expect(Number(dsPhieu[0].soTien)).toBe(500_000);
    expect(dsPhieu[0].chiTiets.map((c) => [c.noiDung, Number(c.soTien)]).sort()).toEqual([["Đăng ký thi", 450_000], ["Đăng ký ôn thi", 50_000]].sort());
  });

  it("(07/10/2026) hủy 1 phần của biên lai chung: hủy cả biên lai (giữ số), lập biên lai thay thế cho phần còn lại; doanh thu đúng", async () => {
    const { khoa, onThi, thi } = await khoaHaiPhan();
    const dk = await dangKySv(khoa.id, [onThi.id]);
    const hp = await layHocPhi(dk);
    const kq = await xacNhanCacThanhPhan(hp.id, hp.thanhPhans.map((d) => d.id), NGUOI);
    expect(Number(kq.phieuThu.soTien)).toBe(750_000);
    expect(await prisma.phieuThu.count({ where: { hocPhiId: hp.id } })).toBe(1);
    await expect(xacNhanCacThanhPhan(hp.id, hp.thanhPhans.map((d) => d.id), NGUOI)).rejects.toThrow(/đã đóng đủ/);

    const dongOn = hp.thanhPhans.find((d) => d.thanhPhanId === onThi.id)!;
    const huy = await chuyenTrangThaiLePhi(hp.id, "CHUA_DONG", "Không mở lớp ôn", NGUOI, dongOn.id);
    expect("phieuDaHuy" in huy && huy.phieuDaHuy).toEqual([kq.phieuThu.soPhieu]);
    const cu = await prisma.phieuThu.findUniqueOrThrow({ where: { id: kq.phieuThu.id } });
    expect(cu.daHuy).toBe(true);
    const thay = await prisma.phieuThu.findFirstOrThrow({ where: { hocPhiId: hp.id, daHuy: false }, include: { chiTiets: true } });
    expect(thay.thayChoSoPhieu).toBe(kq.phieuThu.soPhieu);
    expect(thay.soPhieu).not.toBe(kq.phieuThu.soPhieu);
    expect(Number(thay.soTien)).toBe(450_000);
    expect(thay.chiTiets.map((c) => c.hocPhiThanhPhanId)).toEqual([hp.thanhPhans.find((d) => d.thanhPhanId === thi.id)!.id]);
    expect((await baoCaoDoanhThu({ khoaId: khoa.id })).tongDoanhThu).toBe(450_000);
    const sau = await layHocPhi(dk);
    expect(sau.thanhPhans.find((d) => d.thanhPhanId === thi.id)?.trangThai).toBe("DA_NOP_DU");
    expect(sau.thanhPhans.find((d) => d.thanhPhanId === onThi.id)?.trangThai).toBe("CHUA_NOP");

    // hủy cả khoản: biên lai thay thế bị hủy, không lập thêm biên lai nào
    const huyHet = await chuyenTrangThaiLePhi(hp.id, "CHUA_DONG", "Ghi nhận nhầm", NGUOI);
    expect("phieuThayThe" in huyHet && huyHet.phieuThayThe).toEqual([]);
    expect(await prisma.phieuThu.count({ where: { hocPhiId: hp.id, daHuy: false } })).toBe(0);
    expect(await prisma.phieuThu.count({ where: { hocPhiId: hp.id } })).toBe(2);
  });

  it("danh sách theo thành phần: danh sách ôn thi chỉ gồm thí sinh chọn ôn thi", async () => {
    const { khoa, onThi, thi } = await khoaHaiPhan();
    const a = await dangKySv(khoa.id, [onThi.id]);
    await dangKySv(khoa.id, []);
    const ds = await danhSachTheoThanhPhan(khoa.id);
    expect(ds.find((x) => x.thanhPhan.id === onThi.id)!.ds.map((d) => d.hocPhi.hocVienId)).toEqual([a.hocVienId]);
    expect(ds.find((x) => x.thanhPhan.id === thi.id)!.ds).toHaveLength(2);
    expect((await dsThanhPhanLePhi(khoa.id)).map((t) => t.ten)).toEqual(["Đăng ký ôn thi", "Đăng ký thi"]);
  });
});

describe("HP-02 đối soát Excel theo thành phần", () => {
  /** Ghi giá trị vào các cột theo tiêu đề cho dòng có mã hồ sơ. */
  async function suaTep(noiDung: Buffer, sua: Record<string, Record<string, string>>) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(noiDung as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    let tieuDe: string[] = [];
    ws.eachRow((row) => {
      const o = (row.values as unknown[]).map((v) => String(v ?? ""));
      if (o.includes("Mã hồ sơ")) tieuDe = o;
      else if (tieuDe.length && sua[o[tieuDe.indexOf("Mã hồ sơ")]]) {
        for (const [cot, gt] of Object.entries(sua[o[tieuDe.indexOf("Mã hồ sơ")]])) row.getCell(tieuDe.indexOf(cot)).value = gt;
      }
    });
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  it("tệp có 1 cột trạng thái mỗi thành phần; nạp 'Đã đóng' phần thi chỉ xác nhận phần thi; phần không đăng ký là dòng lỗi", async () => {
    const { khoa, onThi, thi } = await khoaHaiPhan();
    const a = await dangKySv(khoa.id, []);
    const b = await dangKySv(khoa.id, [onThi.id]);
    const [hvA, hvB] = await Promise.all([a, b].map((d) => prisma.hocVien.findUniqueOrThrow({ where: { id: d.hocVienId } })));
    const { noiDung } = await xuatExcelDoiSoat(khoa.id);
    const cotThi = tieuDeCotThanhPhan(thi.ten);
    const cotOn = tieuDeCotThanhPhan(onThi.ten);

    const loi = await nhapExcelDoiSoat(khoa.id, await suaTep(noiDung, { [hvA.maHocVien]: { [cotOn]: "Đã đóng" } }), "ds.xlsx", NGUOI).catch((e) => e);
    expect((loi as DuLieuImportLoiError).cacDongLoi.map((d) => d.loi)).toEqual([expect.stringMatching(/không đăng ký "Đăng ký ôn thi"/)]);
    expect(await prisma.phieuThu.count({ where: { hocPhi: { khoaId: khoa.id } } })).toBe(0);

    const kq = await nhapExcelDoiSoat(khoa.id, await suaTep(noiDung, { [hvA.maHocVien]: { [cotThi]: "Đã đóng" }, [hvB.maHocVien]: { [cotThi]: "Đã đóng" } }), "ds.xlsx", NGUOI);
    expect(kq.daGhiNhan.map((x) => x.soTien)).toEqual([450_000, 450_000]);
    const hpB = await layHocPhi(b);
    expect(Object.fromEntries(hpB.thanhPhans.map((d) => [d.thanhPhan.ten, d.trangThai]))).toEqual({ "Đăng ký thi": "DA_NOP_DU", "Đăng ký ôn thi": "CHUA_NOP" });

    // nạp lại: phần đã ghi nhận bỏ qua, không ghi trùng
    const lan2 = await xuatExcelDoiSoat(khoa.id);
    const kq2 = await nhapExcelDoiSoat(khoa.id, lan2.noiDung, "ds.xlsx", NGUOI);
    expect([kq2.daGhiNhan.length, kq2.daCoTruoc]).toEqual([0, 2]);
  });
});

describe("HP-02 thao tác hàng loạt theo thành phần (bổ sung 07/10/2026)", () => {
  it("chọn nhiều thí sinh xác nhận riêng phần thi; người không chọn ôn thi bị báo khi xác nhận phần ôn thi; hủy cả khoản cần lý do", async () => {
    const { khoa, onThi, thi } = await khoaHaiPhan();
    const ca2 = await dangKySv(khoa.id, [onThi.id]);
    const chiThi = await dangKySv(khoa.id, []);
    const [hpCa2, hpChiThi] = [await layHocPhi(ca2), await layHocPhi(chiThi)];

    const kqThi = await chuyenLePhiLo(khoa.id, [hpCa2.id, hpChiThi.id], "DA_DONG", thi.id, null, NGUOI);
    expect(kqThi).toMatchObject({ thanhCong: 2, loi: [] });
    const sauCa2 = await layHocPhi(ca2);
    expect(sauCa2.thanhPhans.find((d) => d.thanhPhanId === thi.id)?.trangThai).toBe("DA_NOP_DU");
    expect(sauCa2.thanhPhans.find((d) => d.thanhPhanId === onThi.id)?.trangThai).toBe("CHUA_NOP");

    const kqOn = await chuyenLePhiLo(khoa.id, [hpCa2.id, hpChiThi.id], "DA_DONG", onThi.id, null, NGUOI);
    expect(kqOn.thanhCong).toBe(1);
    expect(kqOn.loi).toEqual([{ ten: expect.any(String), loi: "thí sinh không đăng ký thành phần này" }]);
    // cả khoản: đã đóng đủ mọi phần -> báo lại, không lập phiếu trùng
    const kqTatCa = await chuyenLePhiLo(khoa.id, [hpCa2.id], "DA_DONG", null, null, NGUOI);
    expect(kqTatCa.loi[0].loi).toMatch(/đã đóng đủ/);
    expect(await prisma.phieuThu.count({ where: { hocPhiId: hpCa2.id, daHuy: false } })).toBe(2);

    await expect(chuyenLePhiLo(khoa.id, [hpCa2.id], "CHUA_DONG", null, " ", NGUOI)).rejects.toThrow(/lý do/);
    const huy = await chuyenLePhiLo(khoa.id, [hpCa2.id], "CHUA_DONG", null, "Ghi nhận nhầm", NGUOI);
    expect(huy.thanhCong).toBe(1);
    expect(await prisma.phieuThu.count({ where: { hocPhiId: hpCa2.id, daHuy: false } })).toBe(0);
  }, 60_000);
});

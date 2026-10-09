import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { canTaiKhoanKhiDangKy } from "@/lib/form-dang-ky";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa, datHanDangKy } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { chuongTrinhCongKhai, chuongTrinhDangMoDangKy } from "@/server/services/kh/kh-06-danh-muc-cong-khai";
import { dangKyTaiKhoanHocVien, DangKyTaiKhoanError } from "@/server/services/qt/qt-01-tu-dang-ky";
import { MatKhauYeuError } from "@/server/services/qt/qt-01-quan-ly-tai-khoan";
import { timHoacTaoHocVien } from "@/server/services/hv/dung-chung";
import { dangKyDuThi, timLaiDonDuThi } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import { hocVienCuaTaiKhoan } from "@/server/services/kq/kq-05-tra-cuu";
import { xacThucDangNhap } from "@/lib/auth/xac-thuc";
import { KhongTimThayDangKyError } from "@/server/services/hv/loi-hoc-vien";

const loaiHinh: string[] = [];
const chuongTrinh: string[] = [];
const khoaIds: string[] = [];
const cccdTao: string[] = [];

const so = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
const cccd = () => {
  const c = `0${1 + Math.floor(Math.random() * 9)}${so(10)}`;
  cccdTao.push(c);
  return c;
};

afterAll(async () => {
  const dk = await prisma.dangKyHoc.findMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hocPhi.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  const hvIds = [...dk.map((d) => d.hocVienId), ...(await prisma.hocVien.findMany({ where: { soCCCD: { in: cccdTao } } })).map((h) => h.id)];
  await prisma.thongBao.deleteMany({ where: { hocVienId: { in: hvIds } } });
  const tk = await prisma.nguoiDung.findMany({ where: { soCCCD: { in: cccdTao } } });
  await prisma.hocVien.updateMany({ where: { id: { in: hvIds } }, data: { nguoiDungId: null } });
  await prisma.nguoiDung.deleteMany({ where: { id: { in: tk.map((t) => t.id) } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hvIds }, dangKys: { none: {} } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinh } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinh } } });
});

async function taoKhoa(phuongThuc: "CHI_DU_THI" | "TRUC_TUYEN_NOP_GIAY", moTuyenSinh = true) {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_CK_${crypto.randomUUID()}`, ten: "LH công khai" } });
  loaiHinh.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_CK_${crypto.randomUUID()}`,
      ten: "CT công khai",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD",
      ngayBanHanh: new Date(),
      phuongThucDangKys: phuongThuc ? [phuongThuc] : [],
    },
  });
  chuongTrinh.push(ct.id);
  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 5, mucHocPhi: 300000 });
  khoaIds.push(khoa.id);
  if (moTuyenSinh) await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
  return { ct, khoa };
}

const tk = (soCCCD: string, them: Record<string, string> = {}) => ({
  hoTen: "Nguyễn Văn Kiểm Thử",
  soCCCD,
  ngaySinh: "1990-05-20",
  soDienThoai: "0905123456",
  email: "",
  matKhau: "MatKhau123",
  nhapLaiMatKhau: "MatKhau123",
  ...them,
});

describe("Khóa nào cần tài khoản (bổ sung 01/10/2026)", () => {
  it("chỉ khóa đăng ký dự thi (PT3) không cần tài khoản", () => {
    expect(canTaiKhoanKhiDangKy(["CHI_DU_THI"])).toBe(false);
    for (const pt of ["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN", "QUA_DON_VI_LIEN_KET"]) expect(canTaiKhoanKhiDangKy([pt])).toBe(true);
    expect(canTaiKhoanKhiDangKy(["TRUC_TUYEN_NOP_GIAY", "QUA_DON_VI_LIEN_KET"])).toBe(true);
  });
});

describe("QT-01 bổ sung - học viên tự đăng ký tài khoản", () => {
  it("tạo tài khoản học viên (tên đăng nhập = CCCD), tạo hồ sơ, đăng nhập được", async () => {
    const c = cccd();
    const { taiKhoan, hocVien } = await dangKyTaiKhoanHocVien(tk(c));
    expect(taiKhoan).toMatchObject({ tenDangNhap: c, soCCCD: c, maSoHocVien: hocVien.maHocVien });
    expect(await prisma.nguoiDungVaiTro.count({ where: { nguoiDungId: taiKhoan.id, vaiTro: { ma: "HOC_VIEN" } } })).toBe(1);
    expect((await hocVienCuaTaiKhoan(taiKhoan.id))?.id).toBe(hocVien.id);
    expect(await xacThucDangNhap(c, "MatKhau123")).toMatchObject({ id: taiKhoan.id });
    // CCCD đã có tài khoản -> chặn
    await expect(dangKyTaiKhoanHocVien(tk(c))).rejects.toThrow(/đã có tài khoản/);
  });

  it("nhận hồ sơ cũ khi họ tên + ngày sinh khớp; chặn khi không khớp (không chiếm hồ sơ người khác)", async () => {
    const c = cccd();
    const cu = await timHoacTaoHocVien({ hoTen: "Trần Thị Hồ Sơ Cũ", soCCCD: c, ngaySinh: "1985-01-02" });
    await expect(dangKyTaiKhoanHocVien(tk(c, { hoTen: "Người Khác" }))).rejects.toThrow(DangKyTaiKhoanError);
    await expect(dangKyTaiKhoanHocVien(tk(c, { hoTen: "Trần Thị Hồ Sơ Cũ", ngaySinh: "1985-01-03" }))).rejects.toThrow(/không khớp/);
    expect(await prisma.nguoiDung.count({ where: { soCCCD: c } })).toBe(0);
    const { hocVien } = await dangKyTaiKhoanHocVien(tk(c, { hoTen: "trần thị  hồ sơ cũ", ngaySinh: "1985-01-02" }));
    expect(hocVien.id).toBe(cu.id);
    // hồ sơ cũ chỉ được bổ sung chỗ trống
    expect(await prisma.hocVien.findUnique({ where: { id: cu.id } })).toMatchObject({ hoTen: "Trần Thị Hồ Sơ Cũ", soDienThoai: "0905123456" });
  });

  it("chặn dữ liệu không hợp lệ: CCCD sai, mật khẩu yếu, nhập lại không khớp, email sai", async () => {
    await expect(dangKyTaiKhoanHocVien(tk("123"))).rejects.toThrow(/CCCD không hợp lệ/);
    await expect(dangKyTaiKhoanHocVien(tk(cccd(), { matKhau: "abc", nhapLaiMatKhau: "abc" }))).rejects.toThrow(MatKhauYeuError);
    await expect(dangKyTaiKhoanHocVien(tk(cccd(), { nhapLaiMatKhau: "Khac12345" }))).rejects.toThrow(/không khớp/);
    await expect(dangKyTaiKhoanHocVien(tk(cccd(), { email: "x@" }))).rejects.toThrow(/Email/);
    // (bổ sung 08/10/2026) email sai định dạng dù có @ và dấu chấm
    await expect(dangKyTaiKhoanHocVien(tk(cccd(), { email: "ten@gmail..com" }))).rejects.toThrow(/định dạng/);
    await expect(dangKyTaiKhoanHocVien(tk(cccd(), { ngaySinh: "20/05/1990" }))).rejects.toThrow(/Ngày sinh/);
  });
});

describe("KH-06 bổ sung - danh mục chương trình công khai", () => {
  it("chỉ hiện chương trình có khóa đang mở đăng ký (bỏ khóa chưa mở, quá hạn)", async () => {
    const mo = await taoKhoa("CHI_DU_THI");
    const chuaMo = await taoKhoa("TRUC_TUYEN_NOP_GIAY", false);
    const quaHan = await taoKhoa("TRUC_TUYEN_NOP_GIAY");
    await datHanDangKy(quaHan.khoa.id, "2020-01-01", { nguoiThucHienTen: "test" });
    const ds = await chuongTrinhDangMoDangKy();
    const ma = ds.map((c) => c.maCT);
    expect(ma).toContain(mo.ct.maCT);
    expect(ma).not.toContain(chuaMo.ct.maCT);
    expect(ma).not.toContain(quaHan.ct.maCT);
    expect(ds.find((c) => c.maCT === mo.ct.maCT)).toMatchObject({ laDuThi: true, canTaiKhoan: false, soKhoa: 1, phiThapNhat: 300000 });
    const chiTiet = await chuongTrinhCongKhai(mo.ct.maCT);
    expect(chiTiet?.dsKhoa.map((k) => k.maKhoa)).toEqual([mo.khoa.maKhoa]);
    expect(chiTiet?.dsKhoa[0].conCho).toBe(5);
    expect((await chuongTrinhCongKhai(quaHan.ct.maCT))?.dsKhoa).toEqual([]);
  });
});

describe("HV-05 bổ sung - mở lại đơn dự thi (form định danh CCCD) không cần tài khoản", () => {
  it("mở bằng số CCCD + số điện thoại đã khai (sửa 05/10/2026); sai số điện thoại/CCCD thì không mở", async () => {
    const { khoa } = await taoKhoa("CHI_DU_THI");
    const c = cccd();
    const dk = await dangKyDuThi({ khoaId: khoa.id, soDienThoai: "0905000001", hoTen: "Lê Văn Thí Sinh", soCCCD: c });
    expect(await timLaiDonDuThi(khoa.id, { soCCCD: c, soDienThoai: "0905 000 001" })).toBe(dk.id);
    await expect(timLaiDonDuThi(khoa.id, { soCCCD: c, soDienThoai: "0905000999" })).rejects.toThrow(KhongTimThayDangKyError);
    await expect(timLaiDonDuThi(khoa.id, { soCCCD: cccd(), soDienThoai: "0905000001" })).rejects.toThrow(KhongTimThayDangKyError);
  });
});

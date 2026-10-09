import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { dangKyThayMatDonViLienKet } from "@/server/services/hv/hv-11-dang-ky-thay-mat-dvlk";
import { dangKyQuaDonViLienKet } from "@/server/services/hv/hv-12-dang-ky-qua-dvlk";
import { taoDonViLienKet } from "@/server/services/dvlk/dvlk-01-danh-muc";
import { capTaiKhoanDonViLienKet } from "@/server/services/dvlk/dvlk-02-tai-khoan";
import { taoHopDong } from "@/server/services/dvlk/dvlk-03-hop-dong";
import { hoSoCuaDonVi } from "@/server/services/dvlk/dvlk-04-tiep-nhan";
import { KhongPhaiTaiKhoanDvlkError } from "@/server/services/dvlk/loi-dvlk";
import { KhongCoHopDongLienKetHieuLucError, DonViLienKetKhongHopLeChoKhoaError } from "@/server/services/hv/loi-hoc-vien";

const uid = () => crypto.randomUUID().slice(0, 8);
const donViIds: string[] = [];
const nguoiDungIds: string[] = [];
const loaiHinhIds: string[] = [];
const chuongTrinhIds: string[] = [];
const khoaIds: string[] = [];

afterAll(async () => {
  const dsDangKy = await prisma.dangKyHoc.findMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.thongBao.deleteMany({ where: { hocVienId: { in: dsDangKy.map((d) => d.hocVienId) } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: dsDangKy.map((d) => d.hocVienId) } } });
  await prisma.hopDongLienKet.deleteMany({ where: { khoaId: { in: khoaIds } } });
  await prisma.donViLienKet.deleteMany({ where: { id: { in: donViIds } } });
  await prisma.nguoiDung.deleteMany({ where: { id: { in: nguoiDungIds } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaIds } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhIds } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhIds } } });
});

async function taoKhoaPt4() {
  const lh = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH04_${uid()}`, ten: "LH" } });
  loaiHinhIds.push(lh.id);
  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT04_${uid()}`,
      ten: "Chương trình DVLK-04",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      phuongThucDangKys: ["QUA_DON_VI_LIEN_KET"],
    },
  });
  chuongTrinhIds.push(ct.id);
  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 20 });
  khoaIds.push(khoa.id);
  await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
  return khoa;
}

async function taoDonViCoTaiKhoan() {
  const dv = await taoDonViLienKet({ ma: `DV04_${uid()}`, ten: `Đơn vị ${uid()}` });
  donViIds.push(dv.id);
  const tk = await capTaiKhoanDonViLienKet(dv.id, { tenDangNhap: `dv04_${uid()}`, matKhau: "MatKhau123", hoTen: "CB" });
  nguoiDungIds.push(tk.id);
  return { dv, tk };
}

const hocVien = (hoTen: string) => ({
  hoTen,
  soCCCD: Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join(""),
});

describe("DVLK-04 đăng ký và tiếp nhận hồ sơ học viên qua đơn vị liên kết", () => {
  it("đơn vị thấy cả hồ sơ đăng ký hộ (4a) và hồ sơ học viên tự chọn đơn vị (4b), không thấy hồ sơ đơn vị khác", async () => {
    const khoa = await taoKhoaPt4();
    const a = await taoDonViCoTaiKhoan();
    const b = await taoDonViCoTaiKhoan();
    const hdA = await taoHopDong({ donViLienKetId: a.dv.id, khoaId: khoa.id });
    await taoHopDong({ donViLienKetId: b.dv.id, khoaId: khoa.id });

    const hoSo4a = await dangKyThayMatDonViLienKet(a.tk.id, { khoaId: khoa.id, ...hocVien("An 4a") });
    const hoSo4b = await dangKyQuaDonViLienKet({ khoaId: khoa.id, donViLienKetId: a.dv.id, ...hocVien("Bình 4b") });
    const hoSoCuaB = await dangKyThayMatDonViLienKet(b.tk.id, { khoaId: khoa.id, ...hocVien("Cường B") });
    expect([hoSo4a.hopDongLienKetId, hoSo4b.hopDongLienKetId]).toEqual([hdA.id, hdA.id]);

    const { dsHoSo } = await hoSoCuaDonVi(a.tk.id);
    const ids = dsHoSo.map((hs) => hs.id);
    expect(ids.sort()).toEqual([hoSo4a.id, hoSo4b.id].sort());
    expect(ids).not.toContain(hoSoCuaB.id);
    expect(dsHoSo.every((hs) => hs.trangThai === "CHO_NOP_GIAY")).toBe(true);
    // không trả học phí/kết quả học tập (DVLK-02)
    expect(Object.keys(dsHoSo[0].hocVien).sort()).toEqual(
      ["donViCongTac", "email", "hoTen", "maHocVien", "ngaySinh", "soCCCD", "soDienThoai"].sort(),
    );

    // lọc theo hợp đồng của đơn vị khác -> rỗng; theo từ khóa
    const hdB = await prisma.hopDongLienKet.findFirstOrThrow({ where: { donViLienKetId: b.dv.id } });
    expect((await hoSoCuaDonVi(a.tk.id, { hopDongId: hdB.id })).dsHoSo).toHaveLength(0);
    expect((await hoSoCuaDonVi(a.tk.id, { tuKhoa: "bình" })).dsHoSo.map((hs) => hs.id)).toEqual([hoSo4b.id]);
  });

  it("chặn đăng ký qua đơn vị chưa có hợp đồng còn hiệu lực với khóa (4a và 4b)", async () => {
    const khoa = await taoKhoaPt4();
    const a = await taoDonViCoTaiKhoan();
    const hd = await taoHopDong({ donViLienKetId: a.dv.id, khoaId: khoa.id });
    await prisma.hopDongLienKet.update({ where: { id: hd.id }, data: { trangThai: "DA_THANH_LY" } });

    await expect(dangKyThayMatDonViLienKet(a.tk.id, { khoaId: khoa.id, ...hocVien("X") })).rejects.toThrow(
      KhongCoHopDongLienKetHieuLucError,
    );
    await expect(dangKyQuaDonViLienKet({ khoaId: khoa.id, donViLienKetId: a.dv.id, ...hocVien("Y") })).rejects.toThrow(
      DonViLienKetKhongHopLeChoKhoaError,
    );
  });

  it("tài khoản không gắn đơn vị liên kết không xem được hồ sơ", async () => {
    const nd = await prisma.nguoiDung.create({ data: { tenDangNhap: `x04_${uid()}`, matKhauHash: "x", hoTen: "X" } });
    nguoiDungIds.push(nd.id);
    await expect(hoSoCuaDonVi(nd.id)).rejects.toThrow(KhongPhaiTaiKhoanDvlkError);
  });
});

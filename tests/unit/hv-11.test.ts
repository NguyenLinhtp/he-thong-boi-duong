import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { dangKyThayMatDonViLienKet } from "@/server/services/hv/hv-11-dang-ky-thay-mat-dvlk";
import { taoDonViLienKet } from "@/server/services/dvlk/dvlk-01-danh-muc";
import { ganTaiKhoanDonViLienKet } from "@/server/services/dvlk/dvlk-02-tai-khoan";
import {
  MaDonViLienKetTrungError,
  TaiKhoanKhongPhaiCanBoDonViLienKetError,
  TaiKhoanDaGanDonViKhacError,
} from "@/server/services/dvlk/loi-dvlk";
import {
  KhongTimThayKhoaError,
  SaiPhuongThucDangKyError,
  KhoaKhongMoDangKyError,
  DaDangKyKhoaNayError,
  KhongPhaiTaiKhoanDonViLienKetError,
  KhongCoHopDongLienKetHieuLucError,
} from "@/server/services/hv/loi-hoc-vien";

const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];
const hocVienTaoTrongTest: string[] = [];
const donViLienKetTaoTrongTest: string[] = [];
const nguoiDungTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.hopDongLienKet.deleteMany({ where: { donViLienKetId: { in: donViLienKetTaoTrongTest } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
  await prisma.donViLienKet.deleteMany({ where: { id: { in: donViLienKetTaoTrongTest } } });
  await prisma.nguoiDung.deleteMany({ where: { id: { in: nguoiDungTaoTrongTest } } });
});

async function taoKhoaQuaDVLK(siSoToiDa = 2) {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_HV11_${crypto.randomUUID()}`, ten: "Loại hình test HV-11" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_HV11_${crypto.randomUUID()}`,
      ten: "Chương trình test HV-11",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-HV11",
      ngayBanHanh: new Date(),
      phuongThucDangKys: ["QUA_DON_VI_LIEN_KET"],
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa });
  khoaTaoTrongTest.push(khoa.id);
  await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
  return khoa;
}

async function taoTaiKhoanCanBoDVLK() {
  const nd = await prisma.nguoiDung.create({
    data: {
      tenDangNhap: `dvlk_${crypto.randomUUID()}`,
      matKhauHash: "x",
      hoTen: "Cán bộ ĐVLK test",
    },
  });
  nguoiDungTaoTrongTest.push(nd.id);

  const vaiTro = await prisma.vaiTroModel.findUniqueOrThrow({
    where: { ma: "CAN_BO_DON_VI_LIEN_KET" },
  });
  await prisma.nguoiDungVaiTro.create({ data: { nguoiDungId: nd.id, vaiTroId: vaiTro.id } });
  return nd;
}

async function taoDonViVaHopDong(khoaId: string, nguoiDungId?: string) {
  const donVi = await taoDonViLienKet({
    ma: `DVLK_${crypto.randomUUID()}`,
    ten: "Đơn vị liên kết test",
  });
  donViLienKetTaoTrongTest.push(donVi.id);

  if (nguoiDungId) {
    await ganTaiKhoanDonViLienKet(donVi.id, nguoiDungId);
  }

  // fixture tạo thẳng (kể cả khóa không Phương thức 4 để test chặn) - quy tắc lập hợp đồng test ở DVLK-03
  const hopDong = await prisma.hopDongLienKet.create({
    data: { maHopDong: `HD_${crypto.randomUUID()}`, donViLienKetId: donVi.id, khoaId },
  });

  return { donVi, hopDong };
}

describe("HV-11 đăng ký học viên thay mặt đơn vị liên kết (Phương thức 4a)", () => {
  it("đăng ký thành công, hồ sơ chờ nộp giấy, gắn đúng hợp đồng liên kết", async () => {
    const khoa = await taoKhoaQuaDVLK();
    const taiKhoan = await taoTaiKhoanCanBoDVLK();
    const { hopDong } = await taoDonViVaHopDong(khoa.id, taiKhoan.id);

    const dangKy = await dangKyThayMatDonViLienKet(taiKhoan.id, {
      khoaId: khoa.id,
      hoTen: "Học viên qua ĐVLK",
      soCCCD: `CCCD_HV11_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    expect(dangKy.trangThai).toBe("CHO_NOP_GIAY");
    expect(dangKy.hopDongLienKetId).toBe(hopDong.id);
    expect(dangKy.hanNopGiay).not.toBeNull();
  });

  it("báo lỗi khi tài khoản chưa gán đơn vị liên kết nào", async () => {
    const khoa = await taoKhoaQuaDVLK();
    const taiKhoan = await taoTaiKhoanCanBoDVLK();

    await expect(
      dangKyThayMatDonViLienKet(taiKhoan.id, {
        khoaId: khoa.id,
        hoTen: "X",
        soCCCD: `CCCD_${crypto.randomUUID()}`,
      }),
    ).rejects.toThrow(KhongPhaiTaiKhoanDonViLienKetError);
  });

  it("báo lỗi khi khóa không có hợp đồng còn hiệu lực với đơn vị của tài khoản", async () => {
    const khoa = await taoKhoaQuaDVLK();
    const khoaKhac = await taoKhoaQuaDVLK();
    const taiKhoan = await taoTaiKhoanCanBoDVLK();
    await taoDonViVaHopDong(khoaKhac.id, taiKhoan.id);

    await expect(
      dangKyThayMatDonViLienKet(taiKhoan.id, {
        khoaId: khoa.id,
        hoTen: "X",
        soCCCD: `CCCD_${crypto.randomUUID()}`,
      }),
    ).rejects.toThrow(KhongCoHopDongLienKetHieuLucError);
  });

  it("báo lỗi khi chương trình không phải Phương thức 4 (qua đơn vị liên kết)", async () => {
    const lh = await prisma.loaiHinhBoiDuong.create({
      data: { ma: `LH_HV11B_${crypto.randomUUID()}`, ten: "Loại hình test" },
    });
    loaiHinhTaoTrongTest.push(lh.id);
    const ct = await prisma.chuongTrinh.create({
      data: {
        maCT: `CT_HV11B_${crypto.randomUUID()}`,
        ten: "CT khác phương thức",
        loaiHinhBoiDuongId: lh.id,
        trangThai: "DA_BAN_HANH",
        soQuyetDinh: "QD",
        ngayBanHanh: new Date(),
        phuongThucDangKys: ["TRUC_TUYEN_NOP_GIAY"],
      },
    });
    chuongTrinhTaoTrongTest.push(ct.id);
    const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 5 });
    khoaTaoTrongTest.push(khoa.id);
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");

    const taiKhoan = await taoTaiKhoanCanBoDVLK();
    await taoDonViVaHopDong(khoa.id, taiKhoan.id);

    await expect(
      dangKyThayMatDonViLienKet(taiKhoan.id, {
        khoaId: khoa.id,
        hoTen: "X",
        soCCCD: `CCCD_${crypto.randomUUID()}`,
      }),
    ).rejects.toThrow(SaiPhuongThucDangKyError);
  });

  it("báo lỗi khi khóa đã đủ sĩ số / không còn mở đăng ký", async () => {
    const khoa = await taoKhoaQuaDVLK(1);
    const taiKhoan = await taoTaiKhoanCanBoDVLK();
    await taoDonViVaHopDong(khoa.id, taiKhoan.id);

    const dk1 = await dangKyThayMatDonViLienKet(taiKhoan.id, {
      khoaId: khoa.id,
      hoTen: "A",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dk1.hocVienId);

    await expect(
      dangKyThayMatDonViLienKet(taiKhoan.id, {
        khoaId: khoa.id,
        hoTen: "B",
        soCCCD: `CCCD_${crypto.randomUUID()}`,
      }),
    ).rejects.toThrow(KhoaKhongMoDangKyError);
  });

  it("báo lỗi khi đăng ký trùng CCCD vào cùng 1 khóa", async () => {
    const khoa = await taoKhoaQuaDVLK(5);
    const taiKhoan = await taoTaiKhoanCanBoDVLK();
    await taoDonViVaHopDong(khoa.id, taiKhoan.id);
    const cccd = `CCCD_${crypto.randomUUID()}`;

    const dk1 = await dangKyThayMatDonViLienKet(taiKhoan.id, {
      khoaId: khoa.id,
      hoTen: "A",
      soCCCD: cccd,
    });
    hocVienTaoTrongTest.push(dk1.hocVienId);

    await expect(
      dangKyThayMatDonViLienKet(taiKhoan.id, { khoaId: khoa.id, hoTen: "A", soCCCD: cccd }),
    ).rejects.toThrow(DaDangKyKhoaNayError);
  });

  it("báo lỗi khi khóa không tồn tại", async () => {
    const taiKhoan = await taoTaiKhoanCanBoDVLK();
    const khoaTam = await taoKhoaQuaDVLK();
    await taoDonViVaHopDong(khoaTam.id, taiKhoan.id);

    await expect(
      dangKyThayMatDonViLienKet(taiKhoan.id, {
        khoaId: "khong-ton-tai",
        hoTen: "X",
        soCCCD: `CCCD_${crypto.randomUUID()}`,
      }),
    ).rejects.toThrow(KhongTimThayKhoaError);
  });
});

describe("DVLK-01/02 dùng cho HV-11: mã đơn vị, gắn tài khoản", () => {
  it("chặn tạo trùng mã đơn vị liên kết", async () => {
    const ma = `DVLK_DUP_${crypto.randomUUID()}`;
    const donVi = await taoDonViLienKet({ ma, ten: "A" });
    donViLienKetTaoTrongTest.push(donVi.id);

    await expect(taoDonViLienKet({ ma, ten: "B" })).rejects.toThrow(MaDonViLienKetTrungError);
  });

  it("chặn gán tài khoản không có vai trò Cán bộ đơn vị liên kết", async () => {
    const donVi = await taoDonViLienKet({ ma: `DVLK_${crypto.randomUUID()}`, ten: "A" });
    donViLienKetTaoTrongTest.push(donVi.id);

    const ndThuong = await prisma.nguoiDung.create({
      data: { tenDangNhap: `thuong_${crypto.randomUUID()}`, matKhauHash: "x", hoTen: "X" },
    });
    nguoiDungTaoTrongTest.push(ndThuong.id);

    await expect(ganTaiKhoanDonViLienKet(donVi.id, ndThuong.id)).rejects.toThrow(
      TaiKhoanKhongPhaiCanBoDonViLienKetError,
    );
  });

  it("chặn gán 1 tài khoản cho 2 đơn vị liên kết khác nhau", async () => {
    const donVi1 = await taoDonViLienKet({ ma: `DVLK_${crypto.randomUUID()}`, ten: "A" });
    donViLienKetTaoTrongTest.push(donVi1.id);
    const donVi2 = await taoDonViLienKet({ ma: `DVLK_${crypto.randomUUID()}`, ten: "B" });
    donViLienKetTaoTrongTest.push(donVi2.id);

    const taiKhoan = await taoTaiKhoanCanBoDVLK();
    await ganTaiKhoanDonViLienKet(donVi1.id, taiKhoan.id);

    await expect(ganTaiKhoanDonViLienKet(donVi2.id, taiKhoan.id)).rejects.toThrow(
      TaiKhoanDaGanDonViKhacError,
    );
  });
});

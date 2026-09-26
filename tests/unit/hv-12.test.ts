import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import {
  dangKyQuaDonViLienKet,
  dsDonViLienKetChoKhoa,
} from "@/server/services/hv/hv-12-dang-ky-qua-dvlk";
import { taoDonViLienKet } from "@/server/services/dvlk/dvlk-01-danh-muc";
import {
  KhongTimThayKhoaError,
  SaiPhuongThucDangKyError,
  KhoaKhongMoDangKyError,
  DaDangKyKhoaNayError,
  DonViLienKetKhongHopLeChoKhoaError,
} from "@/server/services/hv/loi-hoc-vien";

const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];
const hocVienTaoTrongTest: string[] = [];
const donViLienKetTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.hopDongLienKet.deleteMany({ where: { donViLienKetId: { in: donViLienKetTaoTrongTest } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
  await prisma.donViLienKet.deleteMany({ where: { id: { in: donViLienKetTaoTrongTest } } });
});

async function taoKhoaQuaDVLK(siSoToiDa = 2) {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_HV12_${crypto.randomUUID()}`, ten: "Loại hình test HV-12" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_HV12_${crypto.randomUUID()}`,
      ten: "Chương trình test HV-12",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-HV12",
      ngayBanHanh: new Date(),
      phuongThucDangKy: "QUA_DON_VI_LIEN_KET",
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa });
  khoaTaoTrongTest.push(khoa.id);
  await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
  return khoa;
}

async function taoDonViVaHopDong(khoaId: string) {
  const donVi = await taoDonViLienKet({
    ma: `DVLK12_${crypto.randomUUID()}`,
    ten: "Đơn vị liên kết test HV-12",
  });
  donViLienKetTaoTrongTest.push(donVi.id);

  // fixture tạo thẳng (kể cả khóa không Phương thức 4 để test chặn) - quy tắc lập hợp đồng test ở DVLK-03
  const hopDong = await prisma.hopDongLienKet.create({
    data: { maHopDong: `HD12_${crypto.randomUUID()}`, donViLienKetId: donVi.id, khoaId },
  });

  return { donVi, hopDong };
}

describe("HV-12 học viên tự đăng ký và chọn đơn vị liên kết thu hồ sơ (Phương thức 4b)", () => {
  it("đăng ký thành công, gắn đúng hợp đồng theo đơn vị đã chọn", async () => {
    const khoa = await taoKhoaQuaDVLK();
    const { donVi, hopDong } = await taoDonViVaHopDong(khoa.id);

    const dangKy = await dangKyQuaDonViLienKet({
      khoaId: khoa.id,
      donViLienKetId: donVi.id,
      hoTen: "Học viên tự chọn ĐVLK",
      soCCCD: `CCCD_HV12_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    expect(dangKy.trangThai).toBe("CHO_NOP_GIAY");
    expect(dangKy.hopDongLienKetId).toBe(hopDong.id);
  });

  it("danh sách đơn vị liên kết cho khóa chỉ gồm hợp đồng còn hiệu lực", async () => {
    const khoa = await taoKhoaQuaDVLK();
    const { donVi } = await taoDonViVaHopDong(khoa.id);

    const ds = await dsDonViLienKetChoKhoa(khoa.id);
    expect(ds.map((hd) => hd.donViLienKetId)).toContain(donVi.id);
  });

  it("báo lỗi khi đơn vị liên kết được chọn không có hợp đồng hiệu lực với khóa này", async () => {
    const khoa = await taoKhoaQuaDVLK();
    const khoaKhac = await taoKhoaQuaDVLK();
    const { donVi } = await taoDonViVaHopDong(khoaKhac.id);

    await expect(
      dangKyQuaDonViLienKet({
        khoaId: khoa.id,
        donViLienKetId: donVi.id,
        hoTen: "X",
        soCCCD: `CCCD_${crypto.randomUUID()}`,
      }),
    ).rejects.toThrow(DonViLienKetKhongHopLeChoKhoaError);
  });

  it("báo lỗi khi chương trình không phải Phương thức 4", async () => {
    const lh = await prisma.loaiHinhBoiDuong.create({
      data: { ma: `LH_HV12B_${crypto.randomUUID()}`, ten: "Loại hình test" },
    });
    loaiHinhTaoTrongTest.push(lh.id);
    const ct = await prisma.chuongTrinh.create({
      data: {
        maCT: `CT_HV12B_${crypto.randomUUID()}`,
        ten: "CT khác phương thức",
        loaiHinhBoiDuongId: lh.id,
        trangThai: "DA_BAN_HANH",
        soQuyetDinh: "QD",
        ngayBanHanh: new Date(),
        phuongThucDangKy: "CHI_DU_THI",
      },
    });
    chuongTrinhTaoTrongTest.push(ct.id);
    const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 5 });
    khoaTaoTrongTest.push(khoa.id);
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
    const { donVi } = await taoDonViVaHopDong(khoa.id);

    await expect(
      dangKyQuaDonViLienKet({
        khoaId: khoa.id,
        donViLienKetId: donVi.id,
        hoTen: "X",
        soCCCD: `CCCD_${crypto.randomUUID()}`,
      }),
    ).rejects.toThrow(SaiPhuongThucDangKyError);
  });

  it("báo lỗi khi khóa đã đủ sĩ số", async () => {
    const khoa = await taoKhoaQuaDVLK(1);
    const { donVi } = await taoDonViVaHopDong(khoa.id);

    const dk1 = await dangKyQuaDonViLienKet({
      khoaId: khoa.id,
      donViLienKetId: donVi.id,
      hoTen: "A",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dk1.hocVienId);

    await expect(
      dangKyQuaDonViLienKet({
        khoaId: khoa.id,
        donViLienKetId: donVi.id,
        hoTen: "B",
        soCCCD: `CCCD_${crypto.randomUUID()}`,
      }),
    ).rejects.toThrow(KhoaKhongMoDangKyError);
  });

  it("báo lỗi khi đăng ký trùng CCCD vào cùng 1 khóa", async () => {
    const khoa = await taoKhoaQuaDVLK(5);
    const { donVi } = await taoDonViVaHopDong(khoa.id);
    const cccd = `CCCD_${crypto.randomUUID()}`;

    const dk1 = await dangKyQuaDonViLienKet({
      khoaId: khoa.id,
      donViLienKetId: donVi.id,
      hoTen: "A",
      soCCCD: cccd,
    });
    hocVienTaoTrongTest.push(dk1.hocVienId);

    await expect(
      dangKyQuaDonViLienKet({ khoaId: khoa.id, donViLienKetId: donVi.id, hoTen: "A", soCCCD: cccd }),
    ).rejects.toThrow(DaDangKyKhoaNayError);
  });

  it("báo lỗi khi khóa không tồn tại", async () => {
    await expect(
      dangKyQuaDonViLienKet({
        khoaId: "khong-ton-tai",
        donViLienKetId: "x",
        hoTen: "X",
        soCCCD: `CCCD_${crypto.randomUUID()}`,
      }),
    ).rejects.toThrow(KhongTimThayKhoaError);
  });
});

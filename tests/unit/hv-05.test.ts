import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { dangKyDuThi, danhSachThiSinh } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import {
  KhongTimThayKhoaError,
  SaiPhuongThucDangKyError,
  KhoaKhongMoDangKyError,
  DaDangKyKhoaNayError,
} from "@/server/services/hv/loi-hoc-vien";

const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];
const hocVienTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoKhoaDangTuyenSinh(
  phuongThucDangKy: "CHI_DU_THI" | "TRUC_TUYEN_NOP_GIAY" | null = "CHI_DU_THI",
  siSoToiDa = 2,
) {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_HV05_${crypto.randomUUID()}`, ten: "Loại hình test HV-05" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_HV05_${crypto.randomUUID()}`,
      ten: "Chương trình test HV-05",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-HV05",
      ngayBanHanh: new Date(),
      phuongThucDangKys: phuongThucDangKy ? [phuongThucDangKy] : [],
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa });
  khoaTaoTrongTest.push(khoa.id);
  await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
  return khoa;
}

describe("HV-05 đăng ký dự thi, không qua học (Phương thức 3)", () => {
  it("đăng ký thành công, hồ sơ vào trạng thái chờ duyệt mặc định (không qua bước nộp giấy)", async () => {
    const khoa = await taoKhoaDangTuyenSinh();
    const dangKy = await dangKyDuThi({
      khoaId: khoa.id,
      soDienThoai: "0905000001",
      hoTen: "Thí sinh A",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    expect(dangKy.trangThai).toBe("CHO_DUYET");
    expect(dangKy.khoaId).toBe(khoa.id);
  });

  it("xuất hiện trong danh sách thí sinh dự thi", async () => {
    const khoa = await taoKhoaDangTuyenSinh();
    const dangKy = await dangKyDuThi({
      khoaId: khoa.id,
      soDienThoai: "0905000001",
      hoTen: "Thí sinh B",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    const ds = await danhSachThiSinh(khoa.id);
    expect(ds.map((dk) => dk.id)).toContain(dangKy.id);
  });

  it("chặn khi chương trình không cấu hình Phương thức 3", async () => {
    const khoa = await taoKhoaDangTuyenSinh("TRUC_TUYEN_NOP_GIAY");
    await expect(
      dangKyDuThi({ khoaId: khoa.id, soDienThoai: "0905000001", hoTen: "C", soCCCD: `CCCD_${crypto.randomUUID()}` }),
    ).rejects.toThrow(SaiPhuongThucDangKyError);
  });

  it("chặn khi khóa đã đủ sĩ số", async () => {
    const khoa = await taoKhoaDangTuyenSinh("CHI_DU_THI", 1);
    const dk1 = await dangKyDuThi({ khoaId: khoa.id, soDienThoai: "0905000001", hoTen: "D1", soCCCD: `CCCD_${crypto.randomUUID()}` });
    hocVienTaoTrongTest.push(dk1.hocVienId);

    await expect(
      dangKyDuThi({ khoaId: khoa.id, soDienThoai: "0905000001", hoTen: "D2", soCCCD: `CCCD_${crypto.randomUUID()}` }),
    ).rejects.toThrow(KhoaKhongMoDangKyError);
  });

  it("không đăng ký trùng vào 1 khóa quá 1 lần (cùng CCCD)", async () => {
    const khoa = await taoKhoaDangTuyenSinh("CHI_DU_THI", 5);
    const cccd = `CCCD_${crypto.randomUUID()}`;
    const dk1 = await dangKyDuThi({ khoaId: khoa.id, soDienThoai: "0905000001", hoTen: "E", soCCCD: cccd });
    hocVienTaoTrongTest.push(dk1.hocVienId);

    await expect(dangKyDuThi({ khoaId: khoa.id, soDienThoai: "0905000001", hoTen: "E", soCCCD: cccd })).rejects.toThrow(
      DaDangKyKhoaNayError,
    );
  });

  it("không tìm thấy khóa", async () => {
    await expect(
      dangKyDuThi({ khoaId: "khong-ton-tai", soDienThoai: "0905000001", hoTen: "F", soCCCD: `CCCD_${crypto.randomUUID()}` }),
    ).rejects.toThrow(KhongTimThayKhoaError);
  });
});

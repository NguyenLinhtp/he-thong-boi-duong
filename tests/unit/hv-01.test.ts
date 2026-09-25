import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { dangKyTrucTuyen, layDangKy } from "@/server/services/hv/hv-01-dang-ky-truc-tuyen";
import {
  KhongTimThayKhoaError,
  SaiPhuongThucDangKyError,
  KhoaKhongMoDangKyError,
  DaDangKyKhoaNayError,
  KhongTimThayDangKyError,
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
  phuongThucDangKy: "TRUC_TUYEN_NOP_GIAY" | "IMPORT_TU_XAC_NHAN" | null = "TRUC_TUYEN_NOP_GIAY",
  siSoToiDa = 2,
) {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_HV01_${crypto.randomUUID()}`, ten: "Loại hình test HV-01" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_HV01_${crypto.randomUUID()}`,
      ten: "Chương trình test HV-01",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-HV01",
      ngayBanHanh: new Date(),
      phuongThucDangKy,
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa });
  khoaTaoTrongTest.push(khoa.id);
  await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
  return khoa;
}

describe("HV-01 đăng ký khóa học trực tuyến kèm in đơn đăng ký (Phương thức 1)", () => {
  it("đăng ký thành công, hồ sơ ở trạng thái chờ nộp bản giấy, sinh mã học viên mới", async () => {
    const khoa = await taoKhoaDangTuyenSinh();
    const dangKy = await dangKyTrucTuyen({
      khoaId: khoa.id,
      hoTen: "Nguyễn Văn A",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
      email: "a@example.com",
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    expect(dangKy.trangThai).toBe("CHO_NOP_GIAY");
    expect(dangKy.hocVien.maHocVien).toMatch(/^HV\d{4}\d{4}$/);
    expect(dangKy.khoaId).toBe(khoa.id);
  });

  it("chặn khi chương trình không cấu hình Phương thức 1", async () => {
    const khoa = await taoKhoaDangTuyenSinh("IMPORT_TU_XAC_NHAN");
    await expect(
      dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "B", soCCCD: `CCCD_${crypto.randomUUID()}` }),
    ).rejects.toThrow(SaiPhuongThucDangKyError);
  });

  it("chặn khi chương trình chưa cấu hình phương thức đăng ký nào", async () => {
    const khoa = await taoKhoaDangTuyenSinh(null);
    await expect(
      dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "C", soCCCD: `CCCD_${crypto.randomUUID()}` }),
    ).rejects.toThrow(SaiPhuongThucDangKyError);
  });

  it("chặn khi khóa chưa/không còn mở đăng ký (đã đủ sĩ số)", async () => {
    const khoa = await taoKhoaDangTuyenSinh("TRUC_TUYEN_NOP_GIAY", 1);
    const dk1 = await dangKyTrucTuyen({
      khoaId: khoa.id,
      hoTen: "D1",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dk1.hocVienId);

    await expect(
      dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "D2", soCCCD: `CCCD_${crypto.randomUUID()}` }),
    ).rejects.toThrow(KhoaKhongMoDangKyError);
  });

  it("không đăng ký trùng vào 1 khóa quá 1 lần (cùng CCCD)", async () => {
    const khoa = await taoKhoaDangTuyenSinh("TRUC_TUYEN_NOP_GIAY", 5);
    const cccd = `CCCD_${crypto.randomUUID()}`;
    const dk1 = await dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "E", soCCCD: cccd });
    hocVienTaoTrongTest.push(dk1.hocVienId);

    await expect(
      dangKyTrucTuyen({ khoaId: khoa.id, hoTen: "E", soCCCD: cccd }),
    ).rejects.toThrow(DaDangKyKhoaNayError);
  });

  it("HV-08: cùng 1 CCCD đăng ký 2 khóa khác nhau thì dùng chung 1 mã học viên", async () => {
    const khoa1 = await taoKhoaDangTuyenSinh("TRUC_TUYEN_NOP_GIAY", 5);
    const khoa2 = await taoKhoaDangTuyenSinh("TRUC_TUYEN_NOP_GIAY", 5);
    const cccd = `CCCD_${crypto.randomUUID()}`;

    const dk1 = await dangKyTrucTuyen({ khoaId: khoa1.id, hoTen: "F", soCCCD: cccd });
    hocVienTaoTrongTest.push(dk1.hocVienId);
    const dk2 = await dangKyTrucTuyen({ khoaId: khoa2.id, hoTen: "F", soCCCD: cccd });

    expect(dk2.hocVienId).toBe(dk1.hocVienId);
    expect(dk2.hocVien.maHocVien).toBe(dk1.hocVien.maHocVien);
  });

  it("không tìm thấy khóa", async () => {
    await expect(
      dangKyTrucTuyen({ khoaId: "khong-ton-tai", hoTen: "G", soCCCD: `CCCD_${crypto.randomUUID()}` }),
    ).rejects.toThrow(KhongTimThayKhoaError);
  });

  it("layDangKy trả về đúng hồ sơ kèm học viên/khóa/chương trình", async () => {
    const khoa = await taoKhoaDangTuyenSinh();
    const dangKy = await dangKyTrucTuyen({
      khoaId: khoa.id,
      hoTen: "H",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    const tim = await layDangKy(dangKy.id);
    expect(tim.hocVien.hoTen).toBe("H");
    expect(tim.khoa.chuongTrinh.id).toBe(khoa.chuongTrinhId);
  });

  it("layDangKy báo lỗi khi không tìm thấy", async () => {
    await expect(layDangKy("khong-ton-tai")).rejects.toThrow(KhongTimThayDangKyError);
  });
});

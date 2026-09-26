import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import {
  danhSachHocVienTheoKhoa,
  themHocVienVaoKhoa,
  xoaHocVienKhoiKhoa,
  chuyenHocVienSangKhoa,
  ghiNhanThoiHoc,
} from "@/server/services/hv/hv-09-quan-ly-danh-sach-khoa";
import {
  KhongTimThayKhoaError,
  KhongTimThayDangKyError,
  DaDangKyKhoaNayError,
  KhongTheXoaHocVienCoKetQuaError,
} from "@/server/services/hv/loi-hoc-vien";

const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];
const hocVienTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.ketQuaHocTap.deleteMany({ where: { hocVienId: { in: hocVienTaoTrongTest } } });
  await prisma.ketQuaKhoa.deleteMany({ where: { hocVienId: { in: hocVienTaoTrongTest } } });
  await prisma.chungChi.deleteMany({ where: { hocVienId: { in: hocVienTaoTrongTest } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienTaoTrongTest } } });
  await prisma.hocPhan.deleteMany({ where: { chuongTrinhId: { in: chuongTrinhTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoKhoa() {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_HV09_${crypto.randomUUID()}`, ten: "Loại hình test HV-09" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_HV09_${crypto.randomUUID()}`,
      ten: "Chương trình test HV-09",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-HV09",
      ngayBanHanh: new Date(),
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 10 });
  khoaTaoTrongTest.push(khoa.id);
  return { khoa, chuongTrinh: ct };
}

describe("HV-09 quản lý danh sách học viên theo khóa", () => {
  it("thêm học viên vào khóa thành công, xuất hiện trong danh sách", async () => {
    const { khoa } = await taoKhoa();
    const dangKy = await themHocVienVaoKhoa({
      khoaId: khoa.id,
      hoTen: "Học viên mới",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
      lyDo: "Bổ sung theo yêu cầu",
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    const ds = await danhSachHocVienTheoKhoa(khoa.id);
    expect(ds.map((dk) => dk.id)).toContain(dangKy.id);
  });

  it("chặn thêm trùng khi CCCD đã đăng ký khóa này rồi", async () => {
    const { khoa } = await taoKhoa();
    const cccd = `CCCD_${crypto.randomUUID()}`;
    const dk1 = await themHocVienVaoKhoa({ khoaId: khoa.id, hoTen: "A", soCCCD: cccd });
    hocVienTaoTrongTest.push(dk1.hocVienId);

    await expect(themHocVienVaoKhoa({ khoaId: khoa.id, hoTen: "A", soCCCD: cccd })).rejects.toThrow(
      DaDangKyKhoaNayError,
    );
  });

  it("thêm học viên báo lỗi khi không tìm thấy khóa", async () => {
    await expect(
      themHocVienVaoKhoa({ khoaId: "khong-ton-tai", hoTen: "B", soCCCD: `CCCD_${crypto.randomUUID()}` }),
    ).rejects.toThrow(KhongTimThayKhoaError);
  });

  it("xóa học viên khỏi khóa thành công khi chưa có điểm/chứng chỉ", async () => {
    const { khoa } = await taoKhoa();
    const dangKy = await themHocVienVaoKhoa({
      khoaId: khoa.id,
      hoTen: "C",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    await xoaHocVienKhoiKhoa(dangKy.id);

    const ds = await danhSachHocVienTheoKhoa(khoa.id);
    expect(ds.map((dk) => dk.id)).not.toContain(dangKy.id);
  });

  it("chặn xóa học viên đã có điểm (KetQuaHocTap) ở khóa", async () => {
    const { khoa, chuongTrinh } = await taoKhoa();
    const hocPhan = await prisma.hocPhan.create({
      data: { chuongTrinhId: chuongTrinh.id, ten: "Học phần 1", soTiet: 30, thuTu: 1 },
    });
    const dangKy = await themHocVienVaoKhoa({
      khoaId: khoa.id,
      hoTen: "D",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);
    await prisma.ketQuaHocTap.create({
      data: { hocVienId: dangKy.hocVienId, khoaId: khoa.id, hocPhanId: hocPhan.id, diemKetThuc: 8 },
    });

    await expect(xoaHocVienKhoiKhoa(dangKy.id)).rejects.toThrow(KhongTheXoaHocVienCoKetQuaError);
  });

  it("chặn xóa học viên đã có chứng chỉ ở khóa", async () => {
    const { khoa } = await taoKhoa();
    const dangKy = await themHocVienVaoKhoa({
      khoaId: khoa.id,
      hoTen: "E",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);
    await prisma.chungChi.create({ data: { hocVienId: dangKy.hocVienId, khoaId: khoa.id } });

    await expect(xoaHocVienKhoiKhoa(dangKy.id)).rejects.toThrow(KhongTheXoaHocVienCoKetQuaError);
  });

  it("xóa báo lỗi khi không tìm thấy hồ sơ đăng ký", async () => {
    await expect(xoaHocVienKhoiKhoa("khong-ton-tai")).rejects.toThrow(KhongTimThayDangKyError);
  });

  it("ghi nhận thôi học chuyển đúng trạng thái, không xóa hồ sơ", async () => {
    const { khoa } = await taoKhoa();
    const dangKy = await themHocVienVaoKhoa({
      khoaId: khoa.id,
      hoTen: "F",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    const ketQua = await ghiNhanThoiHoc(dangKy.id, "Lý do cá nhân");
    expect(ketQua.trangThai).toBe("THOI_HOC");

    const ds = await danhSachHocVienTheoKhoa(khoa.id);
    expect(ds.map((dk) => dk.id)).toContain(dangKy.id);
  });

  it("chuyển học viên sang khóa khác thành công (xóa ở khóa cũ, tạo mới ở khóa đích)", async () => {
    const { khoa: khoa1 } = await taoKhoa();
    const { khoa: khoa2 } = await taoKhoa();
    const dangKy = await themHocVienVaoKhoa({
      khoaId: khoa1.id,
      hoTen: "G",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    const dangKyMoi = await chuyenHocVienSangKhoa(dangKy.id, khoa2.id, "Chuyển theo nguyện vọng");
    expect(dangKyMoi.khoaId).toBe(khoa2.id);
    expect(dangKyMoi.hocVienId).toBe(dangKy.hocVienId);

    const dsKhoa1 = await danhSachHocVienTheoKhoa(khoa1.id);
    expect(dsKhoa1.map((dk) => dk.hocVienId)).not.toContain(dangKy.hocVienId);
    const dsKhoa2 = await danhSachHocVienTheoKhoa(khoa2.id);
    expect(dsKhoa2.map((dk) => dk.id)).toContain(dangKyMoi.id);
  });

  it("chặn chuyển khi học viên đã có điểm ở khóa hiện tại", async () => {
    const { khoa: khoa1, chuongTrinh } = await taoKhoa();
    const { khoa: khoa2 } = await taoKhoa();
    const hocPhan = await prisma.hocPhan.create({
      data: { chuongTrinhId: chuongTrinh.id, ten: "Học phần 1", soTiet: 30, thuTu: 1 },
    });
    const dangKy = await themHocVienVaoKhoa({
      khoaId: khoa1.id,
      hoTen: "H",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);
    await prisma.ketQuaHocTap.create({
      data: { hocVienId: dangKy.hocVienId, khoaId: khoa1.id, hocPhanId: hocPhan.id, diemKetThuc: 9 },
    });

    await expect(chuyenHocVienSangKhoa(dangKy.id, khoa2.id)).rejects.toThrow(
      KhongTheXoaHocVienCoKetQuaError,
    );
  });

  it("chặn chuyển khi học viên đã đăng ký sẵn ở khóa đích", async () => {
    const { khoa: khoa1 } = await taoKhoa();
    const { khoa: khoa2 } = await taoKhoa();
    const cccd = `CCCD_${crypto.randomUUID()}`;
    const dangKy1 = await themHocVienVaoKhoa({ khoaId: khoa1.id, hoTen: "I", soCCCD: cccd });
    hocVienTaoTrongTest.push(dangKy1.hocVienId);
    await themHocVienVaoKhoa({ khoaId: khoa2.id, hoTen: "I", soCCCD: cccd });

    await expect(chuyenHocVienSangKhoa(dangKy1.id, khoa2.id)).rejects.toThrow(DaDangKyKhoaNayError);
  });

  it("chuyển báo lỗi khi không tìm thấy khóa đích", async () => {
    const { khoa } = await taoKhoa();
    const dangKy = await themHocVienVaoKhoa({
      khoaId: khoa.id,
      hoTen: "K",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    await expect(chuyenHocVienSangKhoa(dangKy.id, "khong-ton-tai")).rejects.toThrow(
      KhongTimThayKhoaError,
    );
  });
});

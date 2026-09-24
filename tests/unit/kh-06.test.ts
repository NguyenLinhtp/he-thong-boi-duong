import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import {
  linkDangKyCongKhai,
  phatHanhThongBao,
  layKhoaTheoMa,
} from "@/server/services/kh/kh-06-thong-bao-tuyen-sinh";
import { KhongTimThayKhoaError, KhoaChuaMoDangKyError } from "@/server/services/kh/loi-khoa";

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

async function taoKhoa(siSoToiDa = 2) {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_KH06_${crypto.randomUUID()}`, ten: "Loại hình test KH-06" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_KH06_${crypto.randomUUID()}`,
      ten: "Chương trình test KH-06",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-KH06",
      ngayBanHanh: new Date(),
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa });
  khoaTaoTrongTest.push(khoa.id);
  return khoa;
}

async function dangKy(khoaId: string) {
  const hv = await prisma.hocVien.create({
    data: { maHocVien: `HV_KH06_${crypto.randomUUID()}`, hoTen: "Học viên test" },
  });
  hocVienTaoTrongTest.push(hv.id);
  return prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId, trangThai: "CHINH_THUC" } });
}

describe("KH-06 thông báo tuyển sinh/mở khóa", () => {
  it("chưa sinh link khi khóa còn ở Chuẩn bị (chưa mở tuyển sinh)", async () => {
    const khoa = await taoKhoa();
    expect(await linkDangKyCongKhai(khoa.id)).toBeNull();
  });

  it("sinh đúng link công khai khi khóa Đang tuyển sinh và chưa đủ sĩ số", async () => {
    const khoa = await taoKhoa();
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");

    const link = await linkDangKyCongKhai(khoa.id);
    expect(link).toBe(`https://dangky.ued.udn.vn/khoa/${khoa.maKhoa}`);
  });

  it("link tự vô hiệu khi khóa đã đủ sĩ số", async () => {
    const khoa = await taoKhoa(1);
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
    await dangKy(khoa.id);

    expect(await linkDangKyCongKhai(khoa.id)).toBeNull();
  });

  it("link tự vô hiệu khi khóa đã đóng đăng ký (chuyển sang Đang diễn ra)", async () => {
    const khoa = await taoKhoa();
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
    await chuyenTrangThaiKhoa(khoa.id, "DANG_DIEN_RA");

    expect(await linkDangKyCongKhai(khoa.id)).toBeNull();
  });

  it("không tìm thấy khóa khi sinh link", async () => {
    await expect(linkDangKyCongKhai("khong-ton-tai")).rejects.toThrow(KhongTimThayKhoaError);
  });

  it("phát hành thông báo thành công khi khóa đang mở đăng ký", async () => {
    const khoa = await taoKhoa();
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");

    const ketQua = await phatHanhThongBao({
      khoaId: khoa.id,
      noiDung: "Thông báo mở khóa bồi dưỡng nghiệp vụ",
      kenhGui: ["WEBSITE", "EMAIL"],
    });

    expect(ketQua.link).toBe(`https://dangky.ued.udn.vn/khoa/${khoa.maKhoa}`);
    expect(ketQua.noiDung).toBe("Thông báo mở khóa bồi dưỡng nghiệp vụ");
    expect(ketQua.kenhGui).toEqual(["WEBSITE", "EMAIL"]);
  });

  it("chặn phát hành thông báo khi khóa chưa/không còn mở đăng ký", async () => {
    const khoa = await taoKhoa();
    await expect(
      phatHanhThongBao({ khoaId: khoa.id, noiDung: "Test", kenhGui: ["WEBSITE"] }),
    ).rejects.toThrow(KhoaChuaMoDangKyError);
  });

  it("layKhoaTheoMa tìm đúng khóa theo mã, kèm thông tin chương trình", async () => {
    const khoa = await taoKhoa();
    const tim = await layKhoaTheoMa(khoa.maKhoa);
    expect(tim?.id).toBe(khoa.id);
    expect(tim?.chuongTrinh.id).toBe(khoa.chuongTrinhId);
  });

  it("layKhoaTheoMa trả về null khi không tìm thấy", async () => {
    expect(await layKhoaTheoMa("KH-KHONG-TON-TAI")).toBeNull();
  });
});

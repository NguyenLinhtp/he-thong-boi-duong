import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import {
  chuyenTrangThaiKhoa,
  siSoHienTai,
  tinhTrangSiSo,
  coTheNhanDangKy,
} from "@/server/services/kh/kh-05-trang-thai-si-so";
import { KhongTimThayKhoaError, ChuyenTrangThaiKhoaKhongHopLeError } from "@/server/services/kh/loi-khoa";

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
    data: { ma: `LH_KH05_${crypto.randomUUID()}`, ten: "Loại hình test KH-05" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_KH05_${crypto.randomUUID()}`,
      ten: "Chương trình test KH-05",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-KH05",
      ngayBanHanh: new Date(),
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa });
  khoaTaoTrongTest.push(khoa.id);
  return khoa;
}

async function taoHocVienVaDangKy(khoaId: string, trangThai: "CHO_DUYET" | "CHINH_THUC" | "KHONG_HOP_LE" | "THOI_HOC" = "CHINH_THUC") {
  const hv = await prisma.hocVien.create({
    data: { maHocVien: `HV_KH05_${crypto.randomUUID()}`, hoTen: "Học viên test" },
  });
  hocVienTaoTrongTest.push(hv.id);
  return prisma.dangKyHoc.create({ data: { hocVienId: hv.id, khoaId, trangThai } });
}

describe("KH-05 quản lý trạng thái và sĩ số khóa", () => {
  it("khóa mới khởi tạo ở trạng thái Chuẩn bị, sĩ số 0", async () => {
    const khoa = await taoKhoa();
    const tinhTrang = await tinhTrangSiSo(khoa.id);
    expect(khoa.trangThai).toBe("CHUAN_BI");
    expect(tinhTrang).toMatchObject({ siSoHienTai: 0, daDayDu: false });
  });

  it("chuyển trạng thái hợp lệ theo đúng vòng đời: Chuẩn bị -> Tuyển sinh -> Đang diễn ra -> Kết thúc", async () => {
    const khoa = await taoKhoa();
    const b1 = await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
    expect(b1.trangThai).toBe("DANG_TUYEN_SINH");
    const b2 = await chuyenTrangThaiKhoa(khoa.id, "DANG_DIEN_RA");
    expect(b2.trangThai).toBe("DANG_DIEN_RA");
    const b3 = await chuyenTrangThaiKhoa(khoa.id, "DA_KET_THUC");
    expect(b3.trangThai).toBe("DA_KET_THUC");
  });

  it("chặn chuyển trạng thái nhảy cóc (Chuẩn bị -> Đang diễn ra)", async () => {
    const khoa = await taoKhoa();
    await expect(chuyenTrangThaiKhoa(khoa.id, "DANG_DIEN_RA")).rejects.toThrow(
      ChuyenTrangThaiKhoaKhongHopLeError,
    );
  });

  it("chặn chuyển trạng thái sau khi đã Kết thúc (trạng thái cuối)", async () => {
    const khoa = await taoKhoa();
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
    await chuyenTrangThaiKhoa(khoa.id, "DANG_DIEN_RA");
    await chuyenTrangThaiKhoa(khoa.id, "DA_KET_THUC");

    await expect(chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH")).rejects.toThrow(
      ChuyenTrangThaiKhoaKhongHopLeError,
    );
  });

  it("cho phép hủy khóa ở trạng thái Chuẩn bị hoặc Đang tuyển sinh", async () => {
    const khoa = await taoKhoa();
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
    const huy = await chuyenTrangThaiKhoa(khoa.id, "HUY");
    expect(huy.trangThai).toBe("HUY");
  });

  it("không tìm thấy khóa khi chuyển trạng thái", async () => {
    await expect(chuyenTrangThaiKhoa("khong-ton-tai", "DANG_TUYEN_SINH")).rejects.toThrow(
      KhongTimThayKhoaError,
    );
  });

  it("sĩ số hiện tại chỉ đếm đăng ký còn chiếm chỗ, loại trừ không hợp lệ/thôi học", async () => {
    const khoa = await taoKhoa(5);
    await taoHocVienVaDangKy(khoa.id, "CHO_DUYET");
    await taoHocVienVaDangKy(khoa.id, "CHINH_THUC");
    await taoHocVienVaDangKy(khoa.id, "KHONG_HOP_LE");
    await taoHocVienVaDangKy(khoa.id, "THOI_HOC");

    const soLuong = await siSoHienTai(khoa.id);
    expect(soLuong).toBe(2);
  });

  it("không nhận đăng ký khi khóa chưa Đang tuyển sinh", async () => {
    const khoa = await taoKhoa();
    expect(await coTheNhanDangKy(khoa.id)).toBe(false);
  });

  it("không nhận đăng ký khi sĩ số đã đủ", async () => {
    const khoa = await taoKhoa(1);
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
    await taoHocVienVaDangKy(khoa.id, "CHINH_THUC");

    expect(await coTheNhanDangKy(khoa.id)).toBe(false);
  });

  it("nhận đăng ký khi đang tuyển sinh và còn chỗ trống", async () => {
    const khoa = await taoKhoa(2);
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
    await taoHocVienVaDangKy(khoa.id, "CHINH_THUC");

    expect(await coTheNhanDangKy(khoa.id)).toBe(true);
  });
});

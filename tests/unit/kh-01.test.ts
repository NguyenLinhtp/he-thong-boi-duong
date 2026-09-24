import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa, danhSachKhoa, layKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

const chuongTrinhTaoTrongTest: string[] = [];
const loaiHinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoChuongTrinh(trangThai: "DU_THAO" | "DA_BAN_HANH" = "DA_BAN_HANH") {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_KH01_${crypto.randomUUID()}`, ten: "Loại hình test KH-01" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_KH01_${crypto.randomUUID()}`,
      ten: "Chương trình test KH-01",
      loaiHinhBoiDuongId: lh.id,
      trangThai,
      ...(trangThai === "DA_BAN_HANH"
        ? { soQuyetDinh: "QD-KH01", ngayBanHanh: new Date() }
        : {}),
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);
  return ct;
}

describe("KH-01 khởi tạo khóa bồi dưỡng", () => {
  it("khởi tạo thành công từ chương trình Đã ban hành, mã khóa tự sinh, trạng thái Chuẩn bị", async () => {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    const khoa = await khoiTaoKhoa({
      chuongTrinhId: ct.id,
      siSoToiDa: 30,
      thoiGianKhaiGiang: "2026-10-01",
      thoiGianBeGiang: "2026-12-01",
      mucHocPhi: 1500000,
    });
    khoaTaoTrongTest.push(khoa.id);

    expect(khoa.maKhoa).toMatch(/^KH\d{4}\d{3}$/);
    expect(khoa.trangThai).toBe("CHUAN_BI");
    expect(khoa.siSoToiDa).toBe(30);
    expect(khoa.chuongTrinhId).toBe(ct.id);
  });

  it("2 khóa tạo liên tiếp không trùng mã", async () => {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    const khoa1 = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 20 });
    const khoa2 = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 25 });
    khoaTaoTrongTest.push(khoa1.id, khoa2.id);

    expect(khoa1.maKhoa).not.toBe(khoa2.maKhoa);
  });

  it("chặn khởi tạo khóa từ chương trình chưa Đã ban hành (còn Dự thảo)", async () => {
    const ct = await taoChuongTrinh("DU_THAO");
    await expect(
      khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 30 }),
    ).rejects.toThrow(SaiTrangThaiChuongTrinhError);
  });

  it("không tìm thấy chương trình", async () => {
    await expect(
      khoiTaoKhoa({ chuongTrinhId: "khong-ton-tai", siSoToiDa: 30 }),
    ).rejects.toThrow(KhongTimThayChuongTrinhError);
  });

  it("danh sách khóa và lấy chi tiết 1 khóa kèm thông tin chương trình", async () => {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 40 });
    khoaTaoTrongTest.push(khoa.id);

    const ds = await danhSachKhoa();
    expect(ds.map((k) => k.id)).toContain(khoa.id);

    const chiTiet = await layKhoa(khoa.id);
    expect(chiTiet?.chuongTrinh.id).toBe(ct.id);
  });

  it("lấy chi tiết khóa không tồn tại trả về null", async () => {
    const chiTiet = await layKhoa("khong-ton-tai");
    expect(chiTiet).toBeNull();
  });
});

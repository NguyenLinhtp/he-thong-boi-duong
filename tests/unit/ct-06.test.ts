import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  ngungHieuLucChuongTrinh,
  ThieuLyDoNgungHieuLucError,
  ConKhoaChuaKetThucError,
} from "@/server/services/ct/ct-06-luu-tru";
import { SaiTrangThaiChuongTrinhError } from "@/server/services/ct/loi-chuong-trinh";

const chuongTrinhTaoTrongTest: string[] = [];
const loaiHinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoChuongTrinhDaBanHanh() {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_CT06_${crypto.randomUUID()}`, ten: "Loại hình test CT-06" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_CT06_${crypto.randomUUID()}`,
      ten: "Chương trình test CT-06",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-TEST-CT06",
      ngayBanHanh: new Date(),
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);
  return ct;
}

describe("CT-06 ngừng hiệu lực/lưu trữ chương trình", () => {
  it("chuyển thành công sang Ngừng hiệu lực, lưu lý do và ngày", async () => {
    const ct = await taoChuongTrinhDaBanHanh();

    const daNgung = await ngungHieuLucChuongTrinh(ct.id, "Chương trình không còn phù hợp");

    expect(daNgung.trangThai).toBe("NGUNG_HIEU_LUC");
    expect(daNgung.lyDoNgungHieuLuc).toBe("Chương trình không còn phù hợp");
    expect(daNgung.ngayNgungHieuLuc).not.toBeNull();
  });

  it("bắt buộc phải có lý do", async () => {
    const ct = await taoChuongTrinhDaBanHanh();
    await expect(ngungHieuLucChuongTrinh(ct.id, "")).rejects.toThrow(
      ThieuLyDoNgungHieuLucError,
    );
    await expect(ngungHieuLucChuongTrinh(ct.id, "   ")).rejects.toThrow(
      ThieuLyDoNgungHieuLucError,
    );
  });

  it("chặn khi chương trình không ở trạng thái Đã ban hành", async () => {
    const ct = await taoChuongTrinhDaBanHanh();
    await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { trangThai: "DU_THAO" } });

    await expect(ngungHieuLucChuongTrinh(ct.id, "Lý do")).rejects.toThrow(
      SaiTrangThaiChuongTrinhError,
    );
  });

  it("chặn khi chương trình đang có khóa chưa kết thúc", async () => {
    const ct = await taoChuongTrinhDaBanHanh();
    const khoa = await prisma.khoa.create({
      data: {
        maKhoa: `KH_CT06_${crypto.randomUUID()}`,
        chuongTrinhId: ct.id,
        siSoToiDa: 30,
        trangThai: "DANG_TUYEN_SINH",
      },
    });
    khoaTaoTrongTest.push(khoa.id);

    await expect(ngungHieuLucChuongTrinh(ct.id, "Lý do")).rejects.toThrow(
      ConKhoaChuaKetThucError,
    );
  });

  it("cho phép khi khóa duy nhất đã kết thúc hoặc bị hủy", async () => {
    const ct = await taoChuongTrinhDaBanHanh();
    const khoa = await prisma.khoa.create({
      data: {
        maKhoa: `KH_CT06_${crypto.randomUUID()}`,
        chuongTrinhId: ct.id,
        siSoToiDa: 30,
        trangThai: "DA_KET_THUC",
      },
    });
    khoaTaoTrongTest.push(khoa.id);

    const daNgung = await ngungHieuLucChuongTrinh(ct.id, "Đã kết thúc mọi khóa");
    expect(daNgung.trangThai).toBe("NGUNG_HIEU_LUC");
  });
});

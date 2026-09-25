import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { thietLapBuoiHoc } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import { thietLapHinhThucGiangDay, tuDongTaoLinkTrucTuyen } from "@/server/services/kh/kh-04-hinh-thuc-giang-day";
import { tinhTrangLinkBuoiHoc, thuHoiLinkTrucTuyen } from "@/server/services/gd/gd-05-link-truc-tuyen";
import { KhongTimThayBuoiHocError } from "@/server/services/kh/loi-khoa";

const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.buoiHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoKhoaTrucTuyen() {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_GD05_${crypto.randomUUID()}`, ten: "Loại hình test GD-05" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_GD05_${crypto.randomUUID()}`,
      ten: "Chương trình test GD-05",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-GD05",
      ngayBanHanh: new Date(),
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 30 });
  khoaTaoTrongTest.push(khoa.id);
  await thietLapHinhThucGiangDay(khoa.id, "TRUC_TUYEN");

  return khoa;
}

describe("GD-05 tạo và quản lý link phòng học trực tuyến", () => {
  it("chưa có link -> coLink false", async () => {
    const khoa = await taoKhoaTrucTuyen();
    const buoiHoc = await thietLapBuoiHoc({
      khoaId: khoa.id,
      ngayHoc: new Date(Date.now() + 86_400_000),
      gioBatDau: "08:00",
      gioKetThuc: "10:00",
    });

    const tinhTrang = await tinhTrangLinkBuoiHoc(buoiHoc.id);
    expect(tinhTrang.coLink).toBe(false);
  });

  it("buổi học trong tương lai, đã có link -> còn hiệu lực", async () => {
    const khoa = await taoKhoaTrucTuyen();
    await thietLapBuoiHoc({
      khoaId: khoa.id,
      ngayHoc: new Date(Date.now() + 86_400_000),
      gioBatDau: "08:00",
      gioKetThuc: "10:00",
    });
    await tuDongTaoLinkTrucTuyen(khoa.id);

    const buoiHoc = await prisma.buoiHoc.findFirstOrThrow({ where: { khoaId: khoa.id } });
    const tinhTrang = await tinhTrangLinkBuoiHoc(buoiHoc.id);
    expect(tinhTrang.coLink).toBe(true);
    if (tinhTrang.coLink) expect(tinhTrang.conHieuLuc).toBe(true);
  });

  it("buổi học đã qua giờ kết thúc -> link tự động hết hiệu lực dù vẫn còn lưu", async () => {
    const khoa = await taoKhoaTrucTuyen();
    const buoiHocDaQua = await thietLapBuoiHoc({
      khoaId: khoa.id,
      ngayHoc: new Date(Date.now() - 86_400_000),
      gioBatDau: "08:00",
      gioKetThuc: "10:00",
    });
    await tuDongTaoLinkTrucTuyen(khoa.id);

    const tinhTrang = await tinhTrangLinkBuoiHoc(buoiHocDaQua.id);
    expect(tinhTrang.coLink).toBe(true);
    if (tinhTrang.coLink) {
      expect(tinhTrang.conHieuLuc).toBe(false);
      expect(tinhTrang.link).toBeTruthy();
    }
  });

  it("buổi học đã hủy -> link hết hiệu lực dù chưa tới giờ", async () => {
    const khoa = await taoKhoaTrucTuyen();
    const buoiHoc = await thietLapBuoiHoc({
      khoaId: khoa.id,
      ngayHoc: new Date(Date.now() + 86_400_000),
      gioBatDau: "08:00",
      gioKetThuc: "10:00",
    });
    await tuDongTaoLinkTrucTuyen(khoa.id);
    await prisma.buoiHoc.update({ where: { id: buoiHoc.id }, data: { daHuy: true } });

    const tinhTrang = await tinhTrangLinkBuoiHoc(buoiHoc.id);
    expect(tinhTrang.coLink).toBe(true);
    if (tinhTrang.coLink) expect(tinhTrang.conHieuLuc).toBe(false);
  });

  it("thu hồi link thủ công xóa link khỏi buổi học", async () => {
    const khoa = await taoKhoaTrucTuyen();
    await thietLapBuoiHoc({
      khoaId: khoa.id,
      ngayHoc: new Date(Date.now() + 86_400_000),
      gioBatDau: "08:00",
      gioKetThuc: "10:00",
    });
    await tuDongTaoLinkTrucTuyen(khoa.id);

    const buoiHoc = await prisma.buoiHoc.findFirstOrThrow({ where: { khoaId: khoa.id } });
    await thuHoiLinkTrucTuyen(buoiHoc.id);

    const tinhTrang = await tinhTrangLinkBuoiHoc(buoiHoc.id);
    expect(tinhTrang.coLink).toBe(false);
  });

  it("báo lỗi khi không tìm thấy buổi học", async () => {
    await expect(tinhTrangLinkBuoiHoc("khong-ton-tai")).rejects.toThrow(KhongTimThayBuoiHocError);
    await expect(thuHoiLinkTrucTuyen("khong-ton-tai")).rejects.toThrow(KhongTimThayBuoiHocError);
  });
});

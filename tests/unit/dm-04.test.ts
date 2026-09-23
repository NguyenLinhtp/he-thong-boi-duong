import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { MaTrungError, DangDuocThamChieuError } from "@/server/services/shared/loi-danh-muc";
import { taoPhongHoc, xoaPhongHoc, trungLichPhongHoc } from "@/server/services/dm/dm-04-phong-hoc";
import { taoKhoaToiThieu } from "./helpers/tao-khoa-toi-thieu";

const phongHocTaoTrongTest: string[] = [];
const buoiHocTaoTrongTest: string[] = [];
const donDepKhoa: Array<() => Promise<void>> = [];

afterAll(async () => {
  await prisma.buoiHoc.deleteMany({ where: { id: { in: buoiHocTaoTrongTest } } });
  for (const donDep of donDepKhoa) await donDep();
  await prisma.phongHoc.deleteMany({ where: { id: { in: phongHocTaoTrongTest } } });
});

async function taoPhongHocTest() {
  const ma = `PH_TEST_${crypto.randomUUID()}`;
  const phong = await taoPhongHoc({ ma, ten: "Phòng test" });
  phongHocTaoTrongTest.push(phong.id);
  return phong;
}

describe("DM-04 quản lý danh mục phòng học/địa điểm", () => {
  it("chặn tạo trùng mã", async () => {
    const ph = await taoPhongHocTest();
    await expect(taoPhongHoc({ ma: ph.ma, ten: "Trùng mã" })).rejects.toThrow(MaTrungError);
  });

  it("chặn xóa phòng đang có buổi học đã lên lịch", async () => {
    const ph = await taoPhongHocTest();
    const khoa = await taoKhoaToiThieu();
    donDepKhoa.push(khoa.donDep);

    const buoi = await prisma.buoiHoc.create({
      data: { khoaId: khoa.khoaId, ngayHoc: new Date("2026-10-01"), phongHocId: ph.id },
    });
    buoiHocTaoTrongTest.push(buoi.id);

    await expect(xoaPhongHoc(ph.id)).rejects.toThrow(DangDuocThamChieuError);
  });

  it("phát hiện trùng khung giờ cùng phòng trong ngày", async () => {
    const ph = await taoPhongHocTest();
    const khoa = await taoKhoaToiThieu();
    donDepKhoa.push(khoa.donDep);

    const buoi = await prisma.buoiHoc.create({
      data: {
        khoaId: khoa.khoaId,
        ngayHoc: new Date("2026-10-02"),
        phongHocId: ph.id,
        gioBatDau: "08:00",
        gioKetThuc: "10:00",
      },
    });
    buoiHocTaoTrongTest.push(buoi.id);

    const trung = await trungLichPhongHoc({
      phongHocId: ph.id,
      ngayHoc: new Date("2026-10-02"),
      gioBatDau: "09:00",
      gioKetThuc: "11:00",
    });
    expect(trung).toBe(true);

    const khongTrung = await trungLichPhongHoc({
      phongHocId: ph.id,
      ngayHoc: new Date("2026-10-02"),
      gioBatDau: "10:00",
      gioKetThuc: "12:00",
    });
    expect(khongTrung).toBe(false);
  });
});

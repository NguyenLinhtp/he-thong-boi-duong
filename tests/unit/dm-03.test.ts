import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { MaTrungError, DangDuocThamChieuError } from "@/server/services/shared/loi-danh-muc";
import {
  taoLoaiHinhBoiDuong,
  xoaLoaiHinhBoiDuong,
} from "@/server/services/dm/dm-03-loai-hinh-boi-duong";

const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoLoaiHinhTest() {
  const ma = `LH_TEST_${crypto.randomUUID()}`;
  const loaiHinh = await taoLoaiHinhBoiDuong({ ma, ten: "Loại hình test" });
  loaiHinhTaoTrongTest.push(loaiHinh.id);
  return loaiHinh;
}

describe("DM-03 quản lý danh mục loại hình bồi dưỡng", () => {
  it("chặn tạo trùng mã", async () => {
    const lh = await taoLoaiHinhTest();
    await expect(taoLoaiHinhBoiDuong({ ma: lh.ma, ten: "Trùng mã" })).rejects.toThrow(
      MaTrungError,
    );
  });

  it("chặn xóa loại hình đang được chương trình bồi dưỡng sử dụng (mỗi CT gắn đúng 1 loại hình)", async () => {
    const lh = await taoLoaiHinhTest();
    const ct = await prisma.chuongTrinh.create({
      data: {
        maCT: `CT_TEST_${crypto.randomUUID()}`,
        ten: "Chương trình test DM-03",
        loaiHinhBoiDuongId: lh.id,
      },
    });
    chuongTrinhTaoTrongTest.push(ct.id);

    await expect(xoaLoaiHinhBoiDuong(lh.id)).rejects.toThrow(DangDuocThamChieuError);
  });
});

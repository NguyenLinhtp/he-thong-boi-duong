import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { MaTrungError, DangDuocThamChieuError } from "@/server/services/shared/loi-danh-muc";
import { taoDonVi, xoaDonVi } from "@/server/services/dm/dm-01-don-vi";

const donViTaoTrongTest: string[] = [];
const giangVienTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.giangVien.deleteMany({ where: { id: { in: giangVienTaoTrongTest } } });
  await prisma.donVi.deleteMany({ where: { id: { in: donViTaoTrongTest } } });
});

async function taoDonViTest() {
  const ma = `DV_TEST_${crypto.randomUUID()}`;
  const donVi = await taoDonVi({ ma, ten: "Đơn vị test" });
  donViTaoTrongTest.push(donVi.id);
  return donVi;
}

describe("DM-01 quản lý danh mục đơn vị/phòng ban", () => {
  it("chặn tạo đơn vị trùng mã", async () => {
    const donVi = await taoDonViTest();
    await expect(taoDonVi({ ma: donVi.ma, ten: "Trùng mã" })).rejects.toThrow(MaTrungError);
  });

  it("chặn xóa đơn vị đang được giảng viên tham chiếu", async () => {
    const donVi = await taoDonViTest();
    const giangVien = await prisma.giangVien.create({
      data: { hoTen: "Giảng viên test DM-01", donViId: donVi.id },
    });
    giangVienTaoTrongTest.push(giangVien.id);

    await expect(xoaDonVi(donVi.id)).rejects.toThrow(DangDuocThamChieuError);
  });

  it("xóa được đơn vị không bị tham chiếu", async () => {
    const donVi = await taoDonViTest();
    await expect(xoaDonVi(donVi.id)).resolves.not.toThrow();
    donViTaoTrongTest.splice(donViTaoTrongTest.indexOf(donVi.id), 1);
  });
});

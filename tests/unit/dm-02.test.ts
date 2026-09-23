import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { MaTrungError, DangDuocThamChieuError } from "@/server/services/shared/loi-danh-muc";
import {
  taoChucDanhHocVi,
  xoaChucDanhHocVi,
} from "@/server/services/dm/dm-02-chuc-danh-hoc-vi";

const chucDanhTaoTrongTest: string[] = [];
const giangVienTaoTrongTest: string[] = [];
const hocVienTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.giangVien.deleteMany({ where: { id: { in: giangVienTaoTrongTest } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienTaoTrongTest } } });
  await prisma.chucDanhHocVi.deleteMany({ where: { id: { in: chucDanhTaoTrongTest } } });
});

async function taoChucDanhTest() {
  const ma = `CD_TEST_${crypto.randomUUID()}`;
  const chucDanh = await taoChucDanhHocVi({ ma, ten: "Chức danh test", loai: "hoc_vi" });
  chucDanhTaoTrongTest.push(chucDanh.id);
  return chucDanh;
}

describe("DM-02 quản lý danh mục chức danh, học hàm/học vị", () => {
  it("chặn tạo trùng mã", async () => {
    const cd = await taoChucDanhTest();
    await expect(
      taoChucDanhHocVi({ ma: cd.ma, ten: "Trùng mã", loai: "hoc_vi" }),
    ).rejects.toThrow(MaTrungError);
  });

  it("chặn xóa khi đang được gán cho giảng viên", async () => {
    const cd = await taoChucDanhTest();
    const gv = await prisma.giangVien.create({
      data: { hoTen: "GV test DM-02", chucDanhHocViId: cd.id },
    });
    giangVienTaoTrongTest.push(gv.id);

    await expect(xoaChucDanhHocVi(cd.id)).rejects.toThrow(DangDuocThamChieuError);
  });

  it("chặn xóa khi đang được gán cho học viên", async () => {
    const cd = await taoChucDanhTest();
    const hv = await prisma.hocVien.create({
      data: { maHocVien: `HV_TEST_${crypto.randomUUID()}`, hoTen: "HV test DM-02", chucDanhHocViId: cd.id },
    });
    hocVienTaoTrongTest.push(hv.id);

    await expect(xoaChucDanhHocVi(cd.id)).rejects.toThrow(DangDuocThamChieuError);
  });
});

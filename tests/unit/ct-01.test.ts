import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  taoChuongTrinh,
  suaChuongTrinhDuThao,
} from "@/server/services/ct/ct-01-tao-chuong-trinh";
import { SaiTrangThaiChuongTrinhError } from "@/server/services/ct/loi-chuong-trinh";

const chuongTrinhTaoTrongTest: string[] = [];
const loaiHinhTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoLoaiHinhTest() {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_CT01_${crypto.randomUUID()}`, ten: "Loại hình test CT-01" },
  });
  loaiHinhTaoTrongTest.push(lh.id);
  return lh;
}

describe("CT-01 tạo mới chương trình bồi dưỡng", () => {
  it("tạo chương trình mới ở trạng thái Dự thảo với mã tự sinh", async () => {
    const lh = await taoLoaiHinhTest();
    const ct = await taoChuongTrinh({ ten: "Chương trình test CT-01", loaiHinhBoiDuongId: lh.id });
    chuongTrinhTaoTrongTest.push(ct.id);

    expect(ct.trangThai).toBe("DU_THAO");
    expect(ct.maCT).toMatch(/^CT\d{7}$/);
  });

  it("sinh mã không trùng cho nhiều chương trình liên tiếp", async () => {
    const lh = await taoLoaiHinhTest();
    const ct1 = await taoChuongTrinh({ ten: "CT A", loaiHinhBoiDuongId: lh.id });
    const ct2 = await taoChuongTrinh({ ten: "CT B", loaiHinhBoiDuongId: lh.id });
    chuongTrinhTaoTrongTest.push(ct1.id, ct2.id);

    expect(ct1.maCT).not.toBe(ct2.maCT);
  });

  it("cho sửa chương trình khi còn ở trạng thái Dự thảo", async () => {
    const lh = await taoLoaiHinhTest();
    const ct = await taoChuongTrinh({ ten: "Tên cũ", loaiHinhBoiDuongId: lh.id });
    chuongTrinhTaoTrongTest.push(ct.id);

    const daSua = await suaChuongTrinhDuThao(ct.id, {
      ten: "Tên mới",
      loaiHinhBoiDuongId: lh.id,
    });
    expect(daSua.ten).toBe("Tên mới");
  });

  it("chặn sửa trực tiếp khi chương trình không còn ở trạng thái Dự thảo", async () => {
    const lh = await taoLoaiHinhTest();
    const ct = await taoChuongTrinh({ ten: "Đã ban hành test", loaiHinhBoiDuongId: lh.id });
    chuongTrinhTaoTrongTest.push(ct.id);
    await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { trangThai: "DA_BAN_HANH" } });

    await expect(
      suaChuongTrinhDuThao(ct.id, { ten: "Sửa lại", loaiHinhBoiDuongId: lh.id }),
    ).rejects.toThrow(SaiTrangThaiChuongTrinhError);
  });
});

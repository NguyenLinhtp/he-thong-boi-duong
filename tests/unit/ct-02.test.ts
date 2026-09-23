import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  themHocPhan,
  suaHocPhan,
  xoaHocPhan,
  sapXepHocPhan,
  danhSachHocPhan,
  tongSoTietHocPhan,
  tongTietDaKhopThoiLuong,
} from "@/server/services/ct/ct-02-hoc-phan";
import { SaiTrangThaiChuongTrinhError } from "@/server/services/ct/loi-chuong-trinh";

const chuongTrinhTaoTrongTest: string[] = [];
const loaiHinhTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.hocPhan.deleteMany({ where: { chuongTrinhId: { in: chuongTrinhTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoChuongTrinhTest(tongThoiLuong: number | null = 60) {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_CT02_${crypto.randomUUID()}`, ten: "Loại hình test CT-02" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_CT02_${crypto.randomUUID()}`,
      ten: "Chương trình test CT-02",
      loaiHinhBoiDuongId: lh.id,
      tongThoiLuong,
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);
  return ct;
}

describe("CT-02 quản lý học phần/chuyên đề trong chương trình", () => {
  it("thêm học phần mới được đặt thứ tự nối tiếp sau học phần cuối", async () => {
    const ct = await taoChuongTrinhTest();
    const hp1 = await themHocPhan(ct.id, { ten: "Học phần 1", soTiet: 10 });
    const hp2 = await themHocPhan(ct.id, { ten: "Học phần 2", soTiet: 15 });

    expect(hp1.thuTu).toBe(1);
    expect(hp2.thuTu).toBe(2);
  });

  it("sửa và xóa học phần hoạt động đúng", async () => {
    const ct = await taoChuongTrinhTest();
    const hp = await themHocPhan(ct.id, { ten: "Tên cũ", soTiet: 5 });

    const daSua = await suaHocPhan(hp.id, { ten: "Tên mới", soTiet: 8 });
    expect(daSua.ten).toBe("Tên mới");
    expect(daSua.soTiet).toBe(8);

    await xoaHocPhan(hp.id);
    const ds = await danhSachHocPhan(ct.id);
    expect(ds.find((h) => h.id === hp.id)).toBeUndefined();
  });

  it("sắp xếp lại thứ tự học phần theo danh sách id mới", async () => {
    const ct = await taoChuongTrinhTest();
    const hp1 = await themHocPhan(ct.id, { ten: "A", soTiet: 5 });
    const hp2 = await themHocPhan(ct.id, { ten: "B", soTiet: 5 });
    const hp3 = await themHocPhan(ct.id, { ten: "C", soTiet: 5 });

    await sapXepHocPhan(ct.id, [hp3.id, hp1.id, hp2.id]);

    const ds = await danhSachHocPhan(ct.id);
    expect(ds.map((h) => h.id)).toEqual([hp3.id, hp1.id, hp2.id]);
    expect(ds.map((h) => h.thuTu)).toEqual([1, 2, 3]);
  });

  it("tính đúng tổng số tiết và kiểm tra khớp tổng thời lượng chương trình", async () => {
    const ct = await taoChuongTrinhTest(20);
    await themHocPhan(ct.id, { ten: "A", soTiet: 10 });

    expect(await tongSoTietHocPhan(ct.id)).toBe(10);
    expect(await tongTietDaKhopThoiLuong(ct.id)).toBe(false);

    await themHocPhan(ct.id, { ten: "B", soTiet: 10 });
    expect(await tongSoTietHocPhan(ct.id)).toBe(20);
    expect(await tongTietDaKhopThoiLuong(ct.id)).toBe(true);
  });

  it("chặn thêm/sửa/xóa học phần khi chương trình không còn ở trạng thái Dự thảo", async () => {
    const ct = await taoChuongTrinhTest();
    const hp = await themHocPhan(ct.id, { ten: "A", soTiet: 5 });
    await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { trangThai: "DA_BAN_HANH" } });

    await expect(themHocPhan(ct.id, { ten: "B", soTiet: 5 })).rejects.toThrow(
      SaiTrangThaiChuongTrinhError,
    );
    await expect(suaHocPhan(hp.id, { ten: "Sửa", soTiet: 5 })).rejects.toThrow(
      SaiTrangThaiChuongTrinhError,
    );
    await expect(xoaHocPhan(hp.id)).rejects.toThrow(SaiTrangThaiChuongTrinhError);
  });
});

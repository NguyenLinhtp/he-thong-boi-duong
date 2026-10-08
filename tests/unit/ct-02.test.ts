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
const khoaTaoTrongTest: string[] = [];
const hocVienTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.ketQuaHocTap.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.buoiHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienTaoTrongTest } } });
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

  it("chặn thêm/sửa/xóa/sắp xếp học phần khi chương trình Chờ thẩm định hoặc Ngừng hiệu lực", async () => {
    const ct = await taoChuongTrinhTest();
    const hp = await themHocPhan(ct.id, { ten: "A", soTiet: 5 });
    for (const trangThai of ["CHO_THAM_DINH", "NGUNG_HIEU_LUC"] as const) {
      await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { trangThai } });
      await expect(themHocPhan(ct.id, { ten: "B", soTiet: 5, lyDo: "x" })).rejects.toThrow(SaiTrangThaiChuongTrinhError);
      await expect(suaHocPhan(hp.id, { ten: "Sửa", soTiet: 5, lyDo: "x" })).rejects.toThrow(SaiTrangThaiChuongTrinhError);
      await expect(xoaHocPhan(hp.id, "x")).rejects.toThrow(SaiTrangThaiChuongTrinhError);
      await expect(sapXepHocPhan(ct.id, [hp.id])).rejects.toThrow(SaiTrangThaiChuongTrinhError);
    }
  });

  it("chặn tên trống, số tiết không phải số nguyên dương", async () => {
    const ct = await taoChuongTrinhTest();
    await expect(themHocPhan(ct.id, { ten: "  ", soTiet: 5 })).rejects.toThrow(/tên học phần/);
    await expect(themHocPhan(ct.id, { ten: "A", soTiet: 0 })).rejects.toThrow(/Số tiết/);
    await expect(themHocPhan(ct.id, { ten: "A", soTiet: 1.5 })).rejects.toThrow(/Số tiết/);
  });

  it("(07/10/2026) chương trình đã ban hành: thêm/sửa/xóa bắt buộc lý do và ghi nhật ký; sắp xếp không cần lý do", async () => {
    const ct = await taoChuongTrinhTest();
    const hp = await themHocPhan(ct.id, { ten: "A", soTiet: 5 });
    await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { trangThai: "DA_BAN_HANH" } });
    const NGUOI = { nguoiThucHienId: null, nguoiThucHienTen: "Test CT-02" };

    await expect(themHocPhan(ct.id, { ten: "B", soTiet: 5 })).rejects.toThrow(/lý do/);
    await expect(suaHocPhan(hp.id, { ten: "Sửa", soTiet: 5, lyDo: " " })).rejects.toThrow(/lý do/);
    await expect(xoaHocPhan(hp.id)).rejects.toThrow(/lý do/);

    const hpB = await themHocPhan(ct.id, { ten: "B", soTiet: 3, lyDo: "Bổ sung phần thực hành" }, NGUOI);
    expect(hpB.thuTu).toBe(2);
    await suaHocPhan(hp.id, { ten: "A (sửa)", soTiet: 6, lyDo: "Điều chỉnh theo quyết định" }, NGUOI);
    await sapXepHocPhan(ct.id, [hpB.id, hp.id]);
    expect((await danhSachHocPhan(ct.id)).map((h) => h.ten)).toEqual(["B", "A (sửa)"]);
    await xoaHocPhan(hpB.id, "Tạo nhầm", NGUOI);
    expect((await danhSachHocPhan(ct.id)).map((h) => [h.ten, h.thuTu])).toEqual([["A (sửa)", 1]]);

    const nk = await prisma.nhatKyThaoTac.findMany({ where: { doiTuongId: { in: [hp.id, hpB.id] } }, orderBy: { thoiGian: "asc" } });
    expect(nk.map((n) => n.hanhDong)).toEqual(["THEM_HOC_PHAN", "SUA_HOC_PHAN", "XOA_HOC_PHAN"]);
    expect(nk[1].chiTiet).toContain("Điều chỉnh theo quyết định");
  });

  it("(07/10/2026) không xóa học phần đã có dữ liệu ở khóa; không đổi số tiết học phần đã có kết quả (đổi tên vẫn được)", async () => {
    const ct = await taoChuongTrinhTest();
    const hp = await themHocPhan(ct.id, { ten: "A", soTiet: 5 });
    await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { trangThai: "DA_BAN_HANH" } });
    const khoa = await prisma.khoa.create({ data: { maKhoa: `KHCT02${crypto.randomUUID().slice(0, 8)}`, chuongTrinhId: ct.id, siSoToiDa: 10 } });
    khoaTaoTrongTest.push(khoa.id);
    await prisma.buoiHoc.create({ data: { khoaId: khoa.id, hocPhanId: hp.id, ngayHoc: new Date() } });
    await expect(xoaHocPhan(hp.id, "x")).rejects.toThrow(/1 buổi học/);

    const hv = await prisma.hocVien.create({ data: { maHocVien: `HVCT02${crypto.randomUUID().slice(0, 8)}`, hoTen: "HV" } });
    hocVienTaoTrongTest.push(hv.id);
    await prisma.ketQuaHocTap.create({ data: { hocVienId: hv.id, khoaId: khoa.id, hocPhanId: hp.id } });
    await expect(suaHocPhan(hp.id, { ten: "A", soTiet: 6, lyDo: "x" })).rejects.toThrow(/không đổi được số tiết/);
    expect((await suaHocPhan(hp.id, { ten: "A mới", soTiet: 5, lyDo: "Đổi tên" })).ten).toBe("A mới");
    await expect(xoaHocPhan(hp.id, "x")).rejects.toThrow(/kết quả học tập/);
  });
});

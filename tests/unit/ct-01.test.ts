import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  taoChuongTrinh,
  suaChuongTrinhDuThao,
  xoaChuongTrinh,
} from "@/server/services/ct/ct-01-tao-chuong-trinh";
import { SaiTrangThaiChuongTrinhError, KhongXoaDuocChuongTrinhError } from "@/server/services/ct/loi-chuong-trinh";

const chuongTrinhTaoTrongTest: string[] = [];
const loaiHinhTaoTrongTest: string[] = [];

const khoaTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
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

describe("CT-01 xóa chương trình tạo sai (bổ sung 07/10/2026)", () => {
  it("xóa chương trình chưa mở khóa: học phần, học liệu, bài trắc nghiệm xóa theo, ghi nhật ký", async () => {
    const lh = await taoLoaiHinhTest();
    const ct = await taoChuongTrinh({ ten: "CT tạo sai", loaiHinhBoiDuongId: lh.id });
    chuongTrinhTaoTrongTest.push(ct.id);
    await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { trangThai: "DA_BAN_HANH", soQuyetDinh: "99/QĐ-TEST" } });
    const hp = await prisma.hocPhan.create({ data: { chuongTrinhId: ct.id, ten: "HP 1", soTiet: 2, thuTu: 1 } });
    await prisma.hocLieuHocPhan.create({ data: { hocPhanId: hp.id, loai: "THONG_TIN", tieuDe: "Giới thiệu", noiDung: "x", nguoiDang: "test" } });
    await prisma.baiTracNghiem.create({ data: { hocPhanId: hp.id, tieuDe: "Bài 1" } });

    const kq = await xoaChuongTrinh(ct.id, { nguoiThucHienId: null, nguoiThucHienTen: "Test CT-01" });
    expect(kq.maCT).toBe(ct.maCT);
    expect(await prisma.chuongTrinh.findUnique({ where: { id: ct.id } })).toBeNull();
    expect(await prisma.hocPhan.count({ where: { id: hp.id } })).toBe(0);
    expect(await prisma.hocLieuHocPhan.count({ where: { hocPhanId: hp.id } })).toBe(0);
    expect(await prisma.baiTracNghiem.count({ where: { hocPhanId: hp.id } })).toBe(0);
    const nk = await prisma.nhatKyThaoTac.findFirst({ where: { doiTuongId: ct.id, hanhDong: "XOA_CHUONG_TRINH" } });
    expect(nk?.chiTiet).toContain("99/QĐ-TEST");
  });

  it("chặn xóa chương trình đã mở khóa (kể cả khóa đã hủy)", async () => {
    const lh = await taoLoaiHinhTest();
    const ct = await taoChuongTrinh({ ten: "CT đã mở khóa", loaiHinhBoiDuongId: lh.id });
    chuongTrinhTaoTrongTest.push(ct.id);
    const khoa = await prisma.khoa.create({ data: { maKhoa: `KHT${crypto.randomUUID().slice(0, 8)}`, chuongTrinhId: ct.id, siSoToiDa: 10, trangThai: "HUY" } });
    khoaTaoTrongTest.push(khoa.id);

    await expect(xoaChuongTrinh(ct.id)).rejects.toThrow(KhongXoaDuocChuongTrinhError);
    expect(await prisma.chuongTrinh.count({ where: { id: ct.id } })).toBe(1);
  });

  it("báo lỗi khi chương trình không tồn tại", async () => {
    await expect(xoaChuongTrinh("khong-ton-tai")).rejects.toThrow(/Không tìm thấy chương trình/);
  });
});

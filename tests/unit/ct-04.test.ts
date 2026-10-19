import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  suaChuongTrinhDaBanHanh,
  lichSuPhienBan,
  SuaTruongAnhHuongKhoaDangChayError,
} from "@/server/services/ct/ct-04-cap-nhat-da-ban-hanh";
import { SaiTrangThaiChuongTrinhError } from "@/server/services/ct/loi-chuong-trinh";

const chuongTrinhTaoTrongTest: string[] = [];
const loaiHinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.hocPhan.deleteMany({ where: { chuongTrinhId: { in: chuongTrinhTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinhPhienBan.deleteMany({
    where: { chuongTrinhId: { in: chuongTrinhTaoTrongTest } },
  });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoChuongTrinhDaBanHanh() {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_CT04_${crypto.randomUUID()}`, ten: "Loại hình test CT-04" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_CT04_${crypto.randomUUID()}`,
      ten: "Chương trình test CT-04",
      loaiHinhBoiDuongId: lh.id,
      tongThoiLuong: 10,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-TEST",
      ngayBanHanh: new Date(),
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);
  return { ct, lh };
}

describe("CT-04 cập nhật/chỉnh sửa chương trình đã ban hành", () => {
  it("sửa thành công, lưu snapshot vào lịch sử phiên bản và tăng phienBanHienTai", async () => {
    const { ct, lh } = await taoChuongTrinhDaBanHanh();

    const daSua = await suaChuongTrinhDaBanHanh(ct.id, {
      ten: "Tên mới",
      loaiHinhBoiDuongId: lh.id,
      tongThoiLuong: 10,
      lyDoSua: "Chỉnh lại tên cho rõ nghĩa",
    });

    expect(daSua.ten).toBe("Tên mới");
    expect(daSua.phienBanHienTai).toBe(2);

    const lichSu = await lichSuPhienBan(ct.id);
    expect(lichSu).toHaveLength(1);
    expect(lichSu[0].ten).toBe("Chương trình test CT-04");
    expect(lichSu[0].phienBan).toBe(1);
    expect(lichSu[0].lyDoSua).toBe("Chỉnh lại tên cho rõ nghĩa");
  });

  it("chặn sửa khi chương trình không ở trạng thái Đã ban hành", async () => {
    const { ct, lh } = await taoChuongTrinhDaBanHanh();
    await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { trangThai: "DU_THAO" } });

    await expect(
      suaChuongTrinhDaBanHanh(ct.id, { ten: "X", loaiHinhBoiDuongId: lh.id }),
    ).rejects.toThrow(SaiTrangThaiChuongTrinhError);
  });

  it("cho sửa tự do (kể cả đổi loại hình/tổng thời lượng) khi không có khóa hoạt động", async () => {
    const { ct } = await taoChuongTrinhDaBanHanh();
    await prisma.hocPhan.create({ data: { chuongTrinhId: ct.id, ten: "HP", soTiet: 99, thuTu: 1 } });
    const lhKhac = await prisma.loaiHinhBoiDuong.create({
      data: { ma: `LH_CT04_KHAC_${crypto.randomUUID()}`, ten: "Loại hình khác" },
    });
    loaiHinhTaoTrongTest.push(lhKhac.id);

    const daSua = await suaChuongTrinhDaBanHanh(ct.id, {
      ten: "Tên mới",
      loaiHinhBoiDuongId: lhKhac.id,
      tongThoiLuong: 99,
    });
    expect(daSua.loaiHinhBoiDuongId).toBe(lhKhac.id);
    expect(daSua.tongThoiLuong).toBe(99);
  });

  it("(sửa 08/10/2026) có khóa hoạt động: đổi loại hình/tổng thời lượng bắt buộc lý do, khóa dùng giá trị mới; sửa tên không cần lý do", async () => {
    const { ct, lh } = await taoChuongTrinhDaBanHanh();
    const lhKhac = await prisma.loaiHinhBoiDuong.create({ data: { ma: `LH_CT04K_${crypto.randomUUID()}`, ten: "Loại hình khác" } });
    loaiHinhTaoTrongTest.push(lhKhac.id);
    const khoa = await prisma.khoa.create({
      data: {
        maKhoa: `KH_CT04_${crypto.randomUUID()}`,
        chuongTrinhId: ct.id,
        siSoToiDa: 30,
        trangThai: "DANG_DIEN_RA",
      },
    });
    khoaTaoTrongTest.push(khoa.id);

    await expect(
      suaChuongTrinhDaBanHanh(ct.id, { ten: "Tên mới", loaiHinhBoiDuongId: lhKhac.id, tongThoiLuong: 10 }),
    ).rejects.toThrow(SuaTruongAnhHuongKhoaDangChayError);
    await expect(
      suaChuongTrinhDaBanHanh(ct.id, { ten: "Tên mới", loaiHinhBoiDuongId: lh.id, tongThoiLuong: 10, lyDoSua: "  " }),
    ).resolves.toBeTruthy(); // không đổi loại hình/thời lượng -> không cần lý do

    const daSua = await suaChuongTrinhDaBanHanh(ct.id, {
      ten: "Tên mới",
      loaiHinhBoiDuongId: lhKhac.id,
      tongThoiLuong: 10,
      lyDoSua: "Quyết định điều chỉnh loại hình",
    });
    expect(daSua.loaiHinhBoiDuongId).toBe(lhKhac.id);
    const khoaSau = await prisma.khoa.findUniqueOrThrow({ where: { id: khoa.id }, include: { chuongTrinh: true } });
    expect(khoaSau.chuongTrinh.loaiHinhBoiDuongId).toBe(lhKhac.id);
    const nk = await prisma.nhatKyThaoTac.findFirst({ where: { hanhDong: "SUA_CHUONG_TRINH_DA_BAN_HANH", doiTuongId: ct.id }, orderBy: { thoiGian: "desc" } });
    expect(nk?.chiTiet).toContain("áp dụng cho các khóa đang hoạt động");
  });

  // (sửa 19/10/2026) thời lượng tính theo tiết/tín chỉ/buổi - lệch tổng thời lượng học phần chỉ cảnh báo
  it("đổi tổng thời lượng và đơn vị lệch tổng thời lượng học phần vẫn lưu, phiên bản cũ giữ đơn vị cũ", async () => {
    const { ct, lh } = await taoChuongTrinhDaBanHanh();
    await prisma.hocPhan.create({ data: { chuongTrinhId: ct.id, ten: "HP 1", soTiet: 6, thuTu: 1 } });
    await prisma.hocPhan.create({ data: { chuongTrinhId: ct.id, ten: "HP 2", soTiet: 4, thuTu: 2 } });

    const daSua = await suaChuongTrinhDaBanHanh(ct.id, {
      ten: "X",
      loaiHinhBoiDuongId: lh.id,
      tongThoiLuong: 3,
      donViThoiLuong: "TIN_CHI",
    });
    expect([daSua.tongThoiLuong, daSua.donViThoiLuong]).toEqual([3, "TIN_CHI"]);
    const [pb] = await lichSuPhienBan(ct.id);
    expect([pb.tongThoiLuong, pb.donViThoiLuong]).toEqual([10, "TIET"]);
    const nk = await prisma.nhatKyThaoTac.findFirst({ where: { hanhDong: "SUA_CHUONG_TRINH_DA_BAN_HANH", doiTuongId: ct.id }, orderBy: { thoiGian: "desc" } });
    expect(nk?.chiTiet).toContain("tổng thời lượng 10 tiết -> 3 tín chỉ");
  });

  it("chương trình có khóa hoạt động: chỉ đổi đơn vị thời lượng cũng bắt buộc lý do", async () => {
    const { ct, lh } = await taoChuongTrinhDaBanHanh();
    const khoa = await prisma.khoa.create({
      data: { maKhoa: `KH_CT04_DV_${crypto.randomUUID()}`, chuongTrinhId: ct.id, siSoToiDa: 30, trangThai: "DANG_DIEN_RA" },
    });
    khoaTaoTrongTest.push(khoa.id);

    await expect(
      suaChuongTrinhDaBanHanh(ct.id, { ten: ct.ten, loaiHinhBoiDuongId: lh.id, tongThoiLuong: 10, donViThoiLuong: "BUOI" }),
    ).rejects.toThrow(SuaTruongAnhHuongKhoaDangChayError);
    const daSua = await suaChuongTrinhDaBanHanh(ct.id, {
      ten: ct.ten,
      loaiHinhBoiDuongId: lh.id,
      tongThoiLuong: 10,
      donViThoiLuong: "BUOI",
      lyDoSua: "Tính theo buổi",
    });
    expect(daSua.donViThoiLuong).toBe("BUOI");
  });

  // (bổ sung 14/10/2026) chương trình chỉ dự thi (PT3) không bắt buộc học phần/tổng thời lượng
  it("chương trình chỉ dự thi (PT3) đổi hoặc bỏ tổng thời lượng không cần khớp số tiết học phần", async () => {
    const { ct, lh } = await taoChuongTrinhDaBanHanh();
    await prisma.chuongTrinh.update({ where: { id: ct.id }, data: { phuongThucDangKys: ["CHI_DU_THI"] } });

    const daDoi = await suaChuongTrinhDaBanHanh(ct.id, { ten: "Thi CĐR", loaiHinhBoiDuongId: lh.id, tongThoiLuong: 45 });
    expect(daDoi.tongThoiLuong).toBe(45);
    const daBo = await suaChuongTrinhDaBanHanh(ct.id, { ten: "Thi CĐR", loaiHinhBoiDuongId: lh.id, tongThoiLuong: null });
    expect(daBo.tongThoiLuong).toBeNull();
  });
});

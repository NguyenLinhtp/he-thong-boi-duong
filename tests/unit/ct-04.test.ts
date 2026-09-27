import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  suaChuongTrinhDaBanHanh,
  lichSuPhienBan,
  SuaTruongAnhHuongKhoaDangChayError,
  ThoiLuongLechTongTietError,
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

  it("chặn đổi loại hình/tổng thời lượng khi chương trình đang có khóa hoạt động, vẫn cho sửa tên", async () => {
    const { ct, lh } = await taoChuongTrinhDaBanHanh();
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
      suaChuongTrinhDaBanHanh(ct.id, {
        ten: "Tên mới vẫn được đổi",
        loaiHinhBoiDuongId: lh.id,
        tongThoiLuong: 999,
      }),
    ).rejects.toThrow(SuaTruongAnhHuongKhoaDangChayError);

    const daSua = await suaChuongTrinhDaBanHanh(ct.id, {
      ten: "Tên mới vẫn được đổi",
      loaiHinhBoiDuongId: lh.id,
      tongThoiLuong: 10,
    });
    expect(daSua.ten).toBe("Tên mới vẫn được đổi");
    expect(daSua.tongThoiLuong).toBe(10);
  });

  it("chặn đổi tổng thời lượng lệch tổng số tiết học phần (CT-02) - học phần đã khóa sau ban hành", async () => {
    const { ct, lh } = await taoChuongTrinhDaBanHanh();
    await prisma.hocPhan.create({ data: { chuongTrinhId: ct.id, ten: "HP 1", soTiet: 6, thuTu: 1 } });
    await prisma.hocPhan.create({ data: { chuongTrinhId: ct.id, ten: "HP 2", soTiet: 4, thuTu: 2 } });

    await expect(
      suaChuongTrinhDaBanHanh(ct.id, { ten: "X", loaiHinhBoiDuongId: lh.id, tongThoiLuong: 12 }),
    ).rejects.toThrow(ThoiLuongLechTongTietError);
    const sau = await prisma.chuongTrinh.findUniqueOrThrow({ where: { id: ct.id } });
    expect([sau.tongThoiLuong, sau.phienBanHienTai]).toEqual([10, ct.phienBanHienTai]);

    // giữ nguyên thời lượng (khớp 10 tiết) vẫn sửa được các trường khác
    const daSua = await suaChuongTrinhDaBanHanh(ct.id, { ten: "Tên mới", loaiHinhBoiDuongId: lh.id, tongThoiLuong: 10 });
    expect(daSua.ten).toBe("Tên mới");
  });
});

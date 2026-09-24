import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  thietLapPhuongThucDangKy,
  DoiPhuongThucKhiCoKhoaDangHoatDongError,
} from "@/server/services/ct/ct-07-phuong-thuc-dang-ky";
import {
  SaiTrangThaiChuongTrinhError,
  KhongTimThayChuongTrinhError,
} from "@/server/services/ct/loi-chuong-trinh";

const chuongTrinhTaoTrongTest: string[] = [];
const loaiHinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoChuongTrinh(trangThai: "DU_THAO" | "DA_BAN_HANH" | "NGUNG_HIEU_LUC" = "DU_THAO") {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_CT07_${crypto.randomUUID()}`, ten: "Loại hình test CT-07" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_CT07_${crypto.randomUUID()}`,
      ten: "Chương trình test CT-07",
      loaiHinhBoiDuongId: lh.id,
      trangThai,
      ...(trangThai === "DA_BAN_HANH"
        ? { soQuyetDinh: "QD-CT07", ngayBanHanh: new Date() }
        : {}),
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);
  return ct;
}

describe("CT-07 thiết lập phương thức tiếp cận đăng ký học viên", () => {
  it("thiết lập thành công 1 trong 4 phương thức", async () => {
    const ct = await taoChuongTrinh();
    const daSua = await thietLapPhuongThucDangKy(ct.id, "TRUC_TUYEN_NOP_GIAY");
    expect(daSua.phuongThucDangKy).toBe("TRUC_TUYEN_NOP_GIAY");
  });

  it("đổi sang phương thức khác khi chưa có khóa nào", async () => {
    const ct = await taoChuongTrinh();
    await thietLapPhuongThucDangKy(ct.id, "TRUC_TUYEN_NOP_GIAY");
    const daSua = await thietLapPhuongThucDangKy(ct.id, "QUA_DON_VI_LIEN_KET");
    expect(daSua.phuongThucDangKy).toBe("QUA_DON_VI_LIEN_KET");
  });

  it("không tìm thấy chương trình", async () => {
    await expect(
      thietLapPhuongThucDangKy("khong-ton-tai", "CHI_DU_THI"),
    ).rejects.toThrow(KhongTimThayChuongTrinhError);
  });

  it("chặn thiết lập khi chương trình đã ngừng hiệu lực", async () => {
    const ct = await taoChuongTrinh("NGUNG_HIEU_LUC");
    await expect(thietLapPhuongThucDangKy(ct.id, "CHI_DU_THI")).rejects.toThrow(
      SaiTrangThaiChuongTrinhError,
    );
  });

  it("chặn đổi phương thức khi chương trình đang có khóa hoạt động kế thừa phương thức cũ", async () => {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    await thietLapPhuongThucDangKy(ct.id, "IMPORT_TU_XAC_NHAN");

    const khoa = await prisma.khoa.create({
      data: {
        maKhoa: `KH_CT07_${crypto.randomUUID()}`,
        chuongTrinhId: ct.id,
        siSoToiDa: 30,
        trangThai: "DANG_TUYEN_SINH",
      },
    });
    khoaTaoTrongTest.push(khoa.id);

    await expect(
      thietLapPhuongThucDangKy(ct.id, "CHI_DU_THI"),
    ).rejects.toThrow(DoiPhuongThucKhiCoKhoaDangHoatDongError);
  });

  it("vẫn cho 'đổi' sang đúng phương thức hiện tại (no-op) dù đang có khóa hoạt động", async () => {
    const ct = await taoChuongTrinh("DA_BAN_HANH");
    await thietLapPhuongThucDangKy(ct.id, "IMPORT_TU_XAC_NHAN");

    const khoa = await prisma.khoa.create({
      data: {
        maKhoa: `KH_CT07_${crypto.randomUUID()}`,
        chuongTrinhId: ct.id,
        siSoToiDa: 30,
        trangThai: "DANG_DIEN_RA",
      },
    });
    khoaTaoTrongTest.push(khoa.id);

    const daSua = await thietLapPhuongThucDangKy(ct.id, "IMPORT_TU_XAC_NHAN");
    expect(daSua.phuongThucDangKy).toBe("IMPORT_TU_XAC_NHAN");
  });
});

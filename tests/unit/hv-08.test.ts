import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { dangKyDuThi } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import {
  danhSachHocVien,
  layHoSoHocVien,
  capNhatHoSoHocVien,
} from "@/server/services/hv/hv-08-ho-so-hoc-vien";
import { KhongTimThayHocVienError, CccdTrungError } from "@/server/services/hv/loi-hoc-vien";

const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];
const hocVienTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoHocVienDonGian(hoTen: string) {
  const cccd = `CCCD_${crypto.randomUUID()}`;
  const hv = await prisma.hocVien.create({
    data: { maHocVien: `HV_HV08_${crypto.randomUUID()}`, hoTen, soCCCD: cccd },
  });
  hocVienTaoTrongTest.push(hv.id);
  return hv;
}

describe("HV-08 quản lý hồ sơ học viên", () => {
  it("tìm kiếm theo tên, mã học viên, CCCD", async () => {
    const hv = await taoHocVienDonGian(`Nguyễn Test HV08 ${crypto.randomUUID()}`);

    const theoTen = await danhSachHocVien(hv.hoTen);
    expect(theoTen.map((h) => h.id)).toContain(hv.id);

    const theoMa = await danhSachHocVien(hv.maHocVien);
    expect(theoMa.map((h) => h.id)).toContain(hv.id);

    const theoCccd = await danhSachHocVien(hv.soCCCD!);
    expect(theoCccd.map((h) => h.id)).toContain(hv.id);
  });

  it("layHoSoHocVien trả về kèm lịch sử đăng ký các khóa", async () => {
    const lh = await prisma.loaiHinhBoiDuong.create({
      data: { ma: `LH_HV08_${crypto.randomUUID()}`, ten: "Loại hình test HV-08" },
    });
    loaiHinhTaoTrongTest.push(lh.id);
    const ct = await prisma.chuongTrinh.create({
      data: {
        maCT: `CT_HV08_${crypto.randomUUID()}`,
        ten: "CT test HV-08",
        loaiHinhBoiDuongId: lh.id,
        trangThai: "DA_BAN_HANH",
        soQuyetDinh: "QD",
        ngayBanHanh: new Date(),
        phuongThucDangKy: "CHI_DU_THI",
      },
    });
    chuongTrinhTaoTrongTest.push(ct.id);
    const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 10 });
    khoaTaoTrongTest.push(khoa.id);
    await prisma.khoa.update({ where: { id: khoa.id }, data: { trangThai: "DANG_TUYEN_SINH" } });

    const dangKy = await dangKyDuThi({
      khoaId: khoa.id,
      hoTen: "Học viên hồ sơ",
      soCCCD: `CCCD_${crypto.randomUUID()}`,
    });
    hocVienTaoTrongTest.push(dangKy.hocVienId);

    const hoSo = await layHoSoHocVien(dangKy.hocVienId);
    expect(hoSo.dangKys.map((dk) => dk.khoaId)).toContain(khoa.id);
    expect(hoSo.dangKys[0].khoa.chuongTrinh.id).toBe(ct.id);
  });

  it("layHoSoHocVien báo lỗi khi không tìm thấy", async () => {
    await expect(layHoSoHocVien("khong-ton-tai")).rejects.toThrow(KhongTimThayHocVienError);
  });

  it("cập nhật thông tin cá nhân thành công", async () => {
    const hv = await taoHocVienDonGian("Học viên cần sửa");
    const ketQua = await capNhatHoSoHocVien(hv.id, {
      soDienThoai: "0900000001",
      email: "moi@example.com",
      donViCongTac: "Trường mới",
    });

    expect(ketQua.soDienThoai).toBe("0900000001");
    expect(ketQua.email).toBe("moi@example.com");
    expect(ketQua.donViCongTac).toBe("Trường mới");
    expect(ketQua.hoTen).toBe("Học viên cần sửa");
  });

  it("chặn sửa CCCD trùng với 1 học viên khác đã tồn tại", async () => {
    const hv1 = await taoHocVienDonGian("Học viên A");
    const hv2 = await taoHocVienDonGian("Học viên B");

    await expect(
      capNhatHoSoHocVien(hv2.id, { soCCCD: hv1.soCCCD }),
    ).rejects.toThrow(CccdTrungError);
  });

  it("cho phép giữ nguyên CCCD hiện tại khi cập nhật thông tin khác", async () => {
    const hv = await taoHocVienDonGian("Học viên C");
    const ketQua = await capNhatHoSoHocVien(hv.id, { soCCCD: hv.soCCCD, soDienThoai: "0911111111" });
    expect(ketQua.soCCCD).toBe(hv.soCCCD);
    expect(ketQua.soDienThoai).toBe("0911111111");
  });

  it("cập nhật báo lỗi khi không tìm thấy học viên", async () => {
    await expect(capNhatHoSoHocVien("khong-ton-tai", { hoTen: "X" })).rejects.toThrow(
      KhongTimThayHocVienError,
    );
  });
});

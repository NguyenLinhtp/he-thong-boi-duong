import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { phanCongGiangVien } from "@/server/services/kh/kh-02-phan-cong-giang-vien";
import { thietLapBuoiHoc } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import { dsHocVienDeDiemDanh, diemDanhBuoiHoc, bangDiemDanhBuoiHoc } from "@/server/services/gd/gd-01-diem-danh";
import { KhongDuocPhanCongBuoiHocError } from "@/server/services/gd/loi-giang-day";
import { KhongTimThayBuoiHocError } from "@/server/services/kh/loi-khoa";

const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];
const giangVienTaoTrongTest: string[] = [];
const hocVienTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.diemDanh.deleteMany({ where: { buoiHoc: { khoaId: { in: khoaTaoTrongTest } } } });
  await prisma.buoiHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.giangVienHocPhan.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.giangVien.deleteMany({ where: { id: { in: giangVienTaoTrongTest } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoBoiCanh() {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_GD01_${crypto.randomUUID()}`, ten: "Loại hình test GD-01" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_GD01_${crypto.randomUUID()}`,
      ten: "Chương trình test GD-01",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-GD01",
      ngayBanHanh: new Date(),
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const hocPhan = await prisma.hocPhan.create({
    data: { chuongTrinhId: ct.id, ten: "Học phần 1", soTiet: 30, thuTu: 1 },
  });

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 30 });
  khoaTaoTrongTest.push(khoa.id);

  const giangVien = await prisma.giangVien.create({
    data: { hoTen: "Giảng viên test GD-01" },
  });
  giangVienTaoTrongTest.push(giangVien.id);
  await phanCongGiangVien({ khoaId: khoa.id, hocPhanId: hocPhan.id, giangVienId: giangVien.id });

  const buoiHoc = await thietLapBuoiHoc({
    khoaId: khoa.id,
    hocPhanId: hocPhan.id,
    ngayHoc: new Date(),
    gioBatDau: "08:00",
    gioKetThuc: "10:00",
  });

  const hocVien = await prisma.hocVien.create({
    data: { maHocVien: `HV_GD01_${crypto.randomUUID()}`, hoTen: "Học viên test GD-01" },
  });
  hocVienTaoTrongTest.push(hocVien.id);
  await prisma.dangKyHoc.create({
    data: { hocVienId: hocVien.id, khoaId: khoa.id, trangThai: "CHINH_THUC" },
  });

  return { khoa, hocPhan, giangVien, buoiHoc, hocVien };
}

describe("GD-01 điểm danh học viên theo buổi học", () => {
  it("liệt kê đúng học viên chính thức của khóa để điểm danh", async () => {
    const { giangVien, buoiHoc, hocVien } = await taoBoiCanh();

    const ds = await dsHocVienDeDiemDanh(giangVien.id, buoiHoc.id);
    expect(ds).toHaveLength(1);
    expect(ds[0].hocVienId).toBe(hocVien.id);
    expect(ds[0].trangThaiHienTai).toBeNull();
  });

  it("điểm danh thành công, ghi đúng trạng thái và giảng viên điểm danh", async () => {
    const { giangVien, buoiHoc, hocVien } = await taoBoiCanh();

    const ketQua = await diemDanhBuoiHoc(giangVien.id, buoiHoc.id, [
      { hocVienId: hocVien.id, trangThai: "CO_MAT" },
    ]);
    expect(ketQua).toHaveLength(1);
    expect(ketQua[0].trangThai).toBe("CO_MAT");
    expect(ketQua[0].giangVienId).toBe(giangVien.id);

    const bang = await bangDiemDanhBuoiHoc(buoiHoc.id);
    expect(bang).toHaveLength(1);
    expect(bang[0].trangThai).toBe("CO_MAT");
  });

  it("điểm danh lại (sửa) ghi đè đúng trạng thái cũ, không tạo dòng trùng", async () => {
    const { giangVien, buoiHoc, hocVien } = await taoBoiCanh();

    await diemDanhBuoiHoc(giangVien.id, buoiHoc.id, [
      { hocVienId: hocVien.id, trangThai: "CO_MAT" },
    ]);
    await diemDanhBuoiHoc(giangVien.id, buoiHoc.id, [
      { hocVienId: hocVien.id, trangThai: "VANG_CO_PHEP" },
    ]);

    const bang = await bangDiemDanhBuoiHoc(buoiHoc.id);
    expect(bang).toHaveLength(1);
    expect(bang[0].trangThai).toBe("VANG_CO_PHEP");
  });

  it("chặn điểm danh khi giảng viên không được phân công buổi học này", async () => {
    const { buoiHoc, hocVien } = await taoBoiCanh();
    const giangVienKhac = await prisma.giangVien.create({
      data: { hoTen: "Giảng viên khác" },
    });
    giangVienTaoTrongTest.push(giangVienKhac.id);

    await expect(
      diemDanhBuoiHoc(giangVienKhac.id, buoiHoc.id, [
        { hocVienId: hocVien.id, trangThai: "CO_MAT" },
      ]),
    ).rejects.toThrow(KhongDuocPhanCongBuoiHocError);
  });

  it("chặn điểm danh khi buổi học không gắn học phần nào (không xác định được phân công)", async () => {
    const { khoa, giangVien } = await taoBoiCanh();
    const buoiKhongHocPhan = await thietLapBuoiHoc({
      khoaId: khoa.id,
      ngayHoc: new Date(),
    });

    await expect(dsHocVienDeDiemDanh(giangVien.id, buoiKhongHocPhan.id)).rejects.toThrow(
      KhongDuocPhanCongBuoiHocError,
    );
  });

  it("báo lỗi khi không tìm thấy buổi học", async () => {
    const { giangVien } = await taoBoiCanh();
    await expect(dsHocVienDeDiemDanh(giangVien.id, "khong-ton-tai")).rejects.toThrow(
      KhongTimThayBuoiHocError,
    );
  });
});

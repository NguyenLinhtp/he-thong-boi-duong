import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { phanCongGiangVien } from "@/server/services/kh/kh-02-phan-cong-giang-vien";
import { thietLapBuoiHoc } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import { ghiNhatKyBuoiHoc, nhatKyKhoa } from "@/server/services/gd/gd-02-nhat-ky";
import { KhongDuocPhanCongBuoiHocError } from "@/server/services/gd/loi-giang-day";

const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];
const giangVienTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.buoiHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.giangVienHocPhan.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.giangVien.deleteMany({ where: { id: { in: giangVienTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoBoiCanh() {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_GD02_${crypto.randomUUID()}`, ten: "Loại hình test GD-02" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_GD02_${crypto.randomUUID()}`,
      ten: "Chương trình test GD-02",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-GD02",
      ngayBanHanh: new Date(),
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const hocPhan = await prisma.hocPhan.create({
    data: { chuongTrinhId: ct.id, ten: "Học phần 1", soTiet: 30, thuTu: 1 },
  });

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 30 });
  khoaTaoTrongTest.push(khoa.id);

  const giangVien = await prisma.giangVien.create({ data: { hoTen: "Giảng viên test GD-02" } });
  giangVienTaoTrongTest.push(giangVien.id);
  await phanCongGiangVien({ khoaId: khoa.id, hocPhanId: hocPhan.id, giangVienId: giangVien.id });

  const buoiHoc = await thietLapBuoiHoc({
    khoaId: khoa.id,
    hocPhanId: hocPhan.id,
    ngayHoc: new Date(),
  });

  return { khoa, hocPhan, giangVien, buoiHoc };
}

describe("GD-02 ghi nhật ký buổi học", () => {
  it("giảng viên được phân công ghi nhật ký thành công", async () => {
    const { giangVien, buoiHoc } = await taoBoiCanh();

    const ketQua = await ghiNhatKyBuoiHoc(giangVien.id, buoiHoc.id, {
      noiDungDaGiang: "Giới thiệu chương 1",
      nhanXet: "Lớp học tích cực",
    });
    expect(ketQua.noiDungDaGiang).toBe("Giới thiệu chương 1");
    expect(ketQua.nhanXet).toBe("Lớp học tích cực");
  });

  it("nhật ký khóa trả về đúng nội dung đã ghi", async () => {
    const { khoa, giangVien, buoiHoc } = await taoBoiCanh();
    await ghiNhatKyBuoiHoc(giangVien.id, buoiHoc.id, { noiDungDaGiang: "Nội dung X" });

    const ds = await nhatKyKhoa(khoa.id);
    expect(ds).toHaveLength(1);
    expect(ds[0].noiDungDaGiang).toBe("Nội dung X");
  });

  it("chặn ghi nhật ký khi giảng viên không được phân công buổi học", async () => {
    const { buoiHoc } = await taoBoiCanh();
    const giangVienKhac = await prisma.giangVien.create({ data: { hoTen: "GV khác" } });
    giangVienTaoTrongTest.push(giangVienKhac.id);

    await expect(
      ghiNhatKyBuoiHoc(giangVienKhac.id, buoiHoc.id, { noiDungDaGiang: "X" }),
    ).rejects.toThrow(KhongDuocPhanCongBuoiHocError);
  });
});

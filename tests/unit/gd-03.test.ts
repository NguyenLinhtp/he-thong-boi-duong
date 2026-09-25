import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { phanCongGiangVien } from "@/server/services/kh/kh-02-phan-cong-giang-vien";
import { thietLapBuoiHoc } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import { huyBuoiHoc, doiLichBuoiHoc } from "@/server/services/gd/gd-03-doi-lich";
import { ThieuLyDoThayDoiError } from "@/server/services/gd/loi-giang-day";
import { KhongTimThayBuoiHocError, TrungPhongHocError } from "@/server/services/kh/loi-khoa";

const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];
const giangVienTaoTrongTest: string[] = [];
const phongHocTaoTrongTest: string[] = [];
const hocVienTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.buoiHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.giangVienHocPhan.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.giangVien.deleteMany({ where: { id: { in: giangVienTaoTrongTest } } });
  await prisma.phongHoc.deleteMany({ where: { id: { in: phongHocTaoTrongTest } } });
  await prisma.dangKyHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.hocVien.deleteMany({ where: { id: { in: hocVienTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoBoiCanh() {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_GD03_${crypto.randomUUID()}`, ten: "Loại hình test GD-03" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_GD03_${crypto.randomUUID()}`,
      ten: "Chương trình test GD-03",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-GD03",
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
    data: { hoTen: "Giảng viên test GD-03", email: "gv-gd03@example.com" },
  });
  giangVienTaoTrongTest.push(giangVien.id);
  await phanCongGiangVien({ khoaId: khoa.id, hocPhanId: hocPhan.id, giangVienId: giangVien.id });

  const phong1 = await prisma.phongHoc.create({ data: { ma: `P1_${crypto.randomUUID()}`, ten: "Phòng 1" } });
  phongHocTaoTrongTest.push(phong1.id);
  const phong2 = await prisma.phongHoc.create({ data: { ma: `P2_${crypto.randomUUID()}`, ten: "Phòng 2" } });
  phongHocTaoTrongTest.push(phong2.id);

  const buoiHoc = await thietLapBuoiHoc({
    khoaId: khoa.id,
    hocPhanId: hocPhan.id,
    ngayHoc: new Date("2026-10-01"),
    gioBatDau: "08:00",
    gioKetThuc: "10:00",
    phongHocId: phong1.id,
  });

  const hocVien = await prisma.hocVien.create({
    data: { maHocVien: `HV_GD03_${crypto.randomUUID()}`, hoTen: "Học viên test GD-03" },
  });
  hocVienTaoTrongTest.push(hocVien.id);
  await prisma.dangKyHoc.create({
    data: { hocVienId: hocVien.id, khoaId: khoa.id, trangThai: "CHINH_THUC" },
  });

  return { khoa, hocPhan, giangVien, buoiHoc, phong1, phong2 };
}

describe("GD-03 xử lý nghỉ học, đổi lịch, học bù", () => {
  it("hủy buổi học (nghỉ học) thành công, ghi lý do", async () => {
    const { buoiHoc } = await taoBoiCanh();

    const ketQua = await huyBuoiHoc(buoiHoc.id, "Giảng viên ốm đột xuất");
    expect(ketQua.daHuy).toBe(true);
    expect(ketQua.lyDoThayDoi).toBe("Giảng viên ốm đột xuất");
  });

  it("bắt buộc phải có lý do khi hủy buổi", async () => {
    const { buoiHoc } = await taoBoiCanh();
    await expect(huyBuoiHoc(buoiHoc.id, "")).rejects.toThrow(ThieuLyDoThayDoiError);
  });

  it("báo lỗi khi hủy buổi học không tồn tại", async () => {
    await expect(huyBuoiHoc("khong-ton-tai", "Lý do")).rejects.toThrow(KhongTimThayBuoiHocError);
  });

  it("đổi lịch buổi học thành công sang ngày/phòng mới", async () => {
    const { buoiHoc, phong2 } = await taoBoiCanh();

    const ketQua = await doiLichBuoiHoc(buoiHoc.id, {
      ngayHoc: new Date("2026-10-05"),
      gioBatDau: "13:00",
      gioKetThuc: "15:00",
      phongHocId: phong2.id,
      lyDo: "Trùng lịch phòng cũ với sự kiện khác",
    });

    expect(ketQua.phongHocId).toBe(phong2.id);
    expect(ketQua.gioBatDau).toBe("13:00");
    expect(ketQua.lyDoThayDoi).toBe("Trùng lịch phòng cũ với sự kiện khác");
  });

  it("bắt buộc phải có lý do khi đổi lịch", async () => {
    const { buoiHoc, phong2 } = await taoBoiCanh();
    await expect(
      doiLichBuoiHoc(buoiHoc.id, {
        ngayHoc: new Date("2026-10-05"),
        phongHocId: phong2.id,
        lyDo: "",
      }),
    ).rejects.toThrow(ThieuLyDoThayDoiError);
  });

  it("chặn đổi lịch nếu phòng mới đã trùng lịch với buổi học khác", async () => {
    const { khoa, hocPhan, buoiHoc, phong2 } = await taoBoiCanh();
    await thietLapBuoiHoc({
      khoaId: khoa.id,
      hocPhanId: hocPhan.id,
      ngayHoc: new Date("2026-10-05"),
      gioBatDau: "13:00",
      gioKetThuc: "15:00",
      phongHocId: phong2.id,
    });

    await expect(
      doiLichBuoiHoc(buoiHoc.id, {
        ngayHoc: new Date("2026-10-05"),
        gioBatDau: "14:00",
        gioKetThuc: "16:00",
        phongHocId: phong2.id,
        lyDo: "Đổi lịch",
      }),
    ).rejects.toThrow(TrungPhongHocError);
  });

  it("đổi lịch không tự trùng với chính buổi học đang đổi (loại trừ chính nó)", async () => {
    const { buoiHoc, phong1 } = await taoBoiCanh();

    // Giữ nguyên phòng cũ, chỉ đổi giờ - không được tự báo trùng với chính nó.
    const ketQua = await doiLichBuoiHoc(buoiHoc.id, {
      ngayHoc: new Date("2026-10-01"),
      gioBatDau: "09:00",
      gioKetThuc: "11:00",
      phongHocId: phong1.id,
      lyDo: "Dời giờ trong cùng ngày",
    });
    expect(ketQua.gioBatDau).toBe("09:00");
  });
});

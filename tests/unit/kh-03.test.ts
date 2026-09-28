import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { phanCongGiangVien } from "@/server/services/kh/kh-02-phan-cong-giang-vien";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import {
  thietLapBuoiHoc,
  danhSachBuoiHoc,
  lichDayGiangVien,
} from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import {
  KhongTimThayKhoaError,
  TrungLichGiangVienTheoBuoiError,
  TrungPhongHocError,
  KhoaChiDuThiKhongGiangDayError,
} from "@/server/services/kh/loi-khoa";

const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];
const giangVienTaoTrongTest: string[] = [];
const phongHocTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.buoiHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.giangVienHocPhan.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.giangVien.deleteMany({ where: { id: { in: giangVienTaoTrongTest } } });
  await prisma.phongHoc.deleteMany({ where: { id: { in: phongHocTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoChuongTrinhDaBanHanhVoiHocPhan(soHocPhan = 1) {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_KH03_${crypto.randomUUID()}`, ten: "Loại hình test KH-03" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_KH03_${crypto.randomUUID()}`,
      ten: "Chương trình test KH-03",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DU_THAO",
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const hocPhans = [];
  for (let i = 0; i < soHocPhan; i++) {
    hocPhans.push(
      await prisma.hocPhan.create({
        data: { chuongTrinhId: ct.id, ten: `Học phần ${i + 1}`, soTiet: 30, thuTu: i + 1 },
      }),
    );
  }

  const ctDaBanHanh = await prisma.chuongTrinh.update({
    where: { id: ct.id },
    data: { trangThai: "DA_BAN_HANH", soQuyetDinh: "QD-KH03", ngayBanHanh: new Date() },
  });

  return { chuongTrinh: ctDaBanHanh, hocPhans };
}

async function taoKhoa(chuongTrinhId: string) {
  const khoa = await khoiTaoKhoa({ chuongTrinhId, siSoToiDa: 30 });
  khoaTaoTrongTest.push(khoa.id);
  return khoa;
}

async function taoGiangVien(hoTen = "Giảng viên test") {
  const gv = await prisma.giangVien.create({ data: { hoTen } });
  giangVienTaoTrongTest.push(gv.id);
  return gv;
}

async function taoPhongHoc() {
  const ph = await prisma.phongHoc.create({
    data: { ma: `PH_KH03_${crypto.randomUUID()}`, ten: "Phòng test KH-03" },
  });
  phongHocTaoTrongTest.push(ph.id);
  return ph;
}

describe("KH-03 thiết lập thời khóa biểu", () => {
  it("thiết lập buổi học thành công, xuất hiện trong danh sách", async () => {
    const { chuongTrinh, hocPhans } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const khoa = await taoKhoa(chuongTrinh.id);
    const phong = await taoPhongHoc();

    const buoi = await thietLapBuoiHoc({
      khoaId: khoa.id,
      hocPhanId: hocPhans[0].id,
      ngayHoc: "2026-10-05",
      gioBatDau: "08:00",
      gioKetThuc: "10:00",
      phongHocId: phong.id,
    });

    expect(buoi.khoaId).toBe(khoa.id);

    const ds = await danhSachBuoiHoc(khoa.id);
    expect(ds.map((b) => b.id)).toContain(buoi.id);
  });

  it("chặn khi trùng phòng học cùng ngày/giờ (khác khóa)", async () => {
    const { chuongTrinh: ct1, hocPhans: hp1 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const { chuongTrinh: ct2, hocPhans: hp2 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const khoa1 = await taoKhoa(ct1.id);
    const khoa2 = await taoKhoa(ct2.id);
    const phong = await taoPhongHoc();

    await thietLapBuoiHoc({
      khoaId: khoa1.id,
      hocPhanId: hp1[0].id,
      ngayHoc: "2026-10-06",
      gioBatDau: "08:00",
      gioKetThuc: "10:00",
      phongHocId: phong.id,
    });

    await expect(
      thietLapBuoiHoc({
        khoaId: khoa2.id,
        hocPhanId: hp2[0].id,
        ngayHoc: "2026-10-06",
        gioBatDau: "09:00",
        gioKetThuc: "11:00",
        phongHocId: phong.id,
      }),
    ).rejects.toThrow(TrungPhongHocError);
  });

  it("không chặn khi trùng phòng nhưng khác giờ trong ngày", async () => {
    const { chuongTrinh: ct1, hocPhans: hp1 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const { chuongTrinh: ct2, hocPhans: hp2 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const khoa1 = await taoKhoa(ct1.id);
    const khoa2 = await taoKhoa(ct2.id);
    const phong = await taoPhongHoc();

    await thietLapBuoiHoc({
      khoaId: khoa1.id,
      hocPhanId: hp1[0].id,
      ngayHoc: "2026-10-07",
      gioBatDau: "08:00",
      gioKetThuc: "10:00",
      phongHocId: phong.id,
    });

    const buoi2 = await thietLapBuoiHoc({
      khoaId: khoa2.id,
      hocPhanId: hp2[0].id,
      ngayHoc: "2026-10-07",
      gioBatDau: "10:00",
      gioKetThuc: "12:00",
      phongHocId: phong.id,
    });

    expect(buoi2.phongHocId).toBe(phong.id);
  });

  it("chặn khi trùng lịch giảng viên (đã phân công học phần ở khóa khác) cùng ngày/giờ", async () => {
    const { chuongTrinh: ct1, hocPhans: hp1 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const { chuongTrinh: ct2, hocPhans: hp2 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const khoa1 = await taoKhoa(ct1.id);
    const khoa2 = await taoKhoa(ct2.id);
    const gv = await taoGiangVien();

    await phanCongGiangVien({ khoaId: khoa1.id, hocPhanId: hp1[0].id, giangVienId: gv.id });
    await phanCongGiangVien({ khoaId: khoa2.id, hocPhanId: hp2[0].id, giangVienId: gv.id });

    await thietLapBuoiHoc({
      khoaId: khoa1.id,
      hocPhanId: hp1[0].id,
      ngayHoc: "2026-10-08",
      gioBatDau: "08:00",
      gioKetThuc: "10:00",
    });

    await expect(
      thietLapBuoiHoc({
        khoaId: khoa2.id,
        hocPhanId: hp2[0].id,
        ngayHoc: "2026-10-08",
        gioBatDau: "09:00",
        gioKetThuc: "11:00",
      }),
    ).rejects.toThrow(TrungLichGiangVienTheoBuoiError);
  });

  it("không chặn trùng lịch giảng viên khi học phần đó chưa được phân công giảng viên (KH-02)", async () => {
    const { chuongTrinh, hocPhans } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const khoa = await taoKhoa(chuongTrinh.id);

    const buoi = await thietLapBuoiHoc({
      khoaId: khoa.id,
      hocPhanId: hocPhans[0].id,
      ngayHoc: "2026-10-09",
      gioBatDau: "08:00",
      gioKetThuc: "10:00",
    });

    expect(buoi.id).toBeDefined();
  });

  it("không tìm thấy khóa", async () => {
    await expect(
      thietLapBuoiHoc({ khoaId: "khong-ton-tai", ngayHoc: "2026-10-10" }),
    ).rejects.toThrow(KhongTimThayKhoaError);
  });

  it("không chặn trùng lịch giảng viên nếu khóa kia đã bị hủy (không còn vận hành)", async () => {
    const { chuongTrinh: ct1, hocPhans: hp1 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const { chuongTrinh: ct2, hocPhans: hp2 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const khoa1 = await taoKhoa(ct1.id);
    const khoa2 = await taoKhoa(ct2.id);
    const gv = await taoGiangVien();

    await phanCongGiangVien({ khoaId: khoa1.id, hocPhanId: hp1[0].id, giangVienId: gv.id });
    await phanCongGiangVien({ khoaId: khoa2.id, hocPhanId: hp2[0].id, giangVienId: gv.id });
    await thietLapBuoiHoc({
      khoaId: khoa1.id,
      hocPhanId: hp1[0].id,
      ngayHoc: "2026-10-20",
      gioBatDau: "08:00",
      gioKetThuc: "10:00",
    });
    await chuyenTrangThaiKhoa(khoa1.id, "HUY");

    const buoi = await thietLapBuoiHoc({
      khoaId: khoa2.id,
      hocPhanId: hp2[0].id,
      ngayHoc: "2026-10-20",
      gioBatDau: "09:00",
      gioKetThuc: "11:00",
    });
    expect(buoi.id).toBeDefined();
  });

  it("lichDayGiangVien trả về đầy đủ buổi dạy của giảng viên trên các khóa, sắp theo ngày/giờ", async () => {
    const { chuongTrinh: ct1, hocPhans: hp1 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const { chuongTrinh: ct2, hocPhans: hp2 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const khoa1 = await taoKhoa(ct1.id);
    const khoa2 = await taoKhoa(ct2.id);
    const gv = await taoGiangVien();

    await phanCongGiangVien({ khoaId: khoa1.id, hocPhanId: hp1[0].id, giangVienId: gv.id });
    await phanCongGiangVien({ khoaId: khoa2.id, hocPhanId: hp2[0].id, giangVienId: gv.id });
    await thietLapBuoiHoc({
      khoaId: khoa2.id,
      hocPhanId: hp2[0].id,
      ngayHoc: "2026-10-22",
      gioBatDau: "13:00",
      gioKetThuc: "15:00",
    });
    await thietLapBuoiHoc({
      khoaId: khoa1.id,
      hocPhanId: hp1[0].id,
      ngayHoc: "2026-10-21",
      gioBatDau: "08:00",
      gioKetThuc: "10:00",
    });

    const lich = await lichDayGiangVien(gv.id);
    expect(lich).toHaveLength(2);
    expect(lich[0].khoaId).toBe(khoa1.id);
    expect(lich[1].khoaId).toBe(khoa2.id);
    expect(lich[0].khoa.chuongTrinh.id).toBe(ct1.id);
  });

  it("lichDayGiangVien loại trừ buổi dạy ở khóa đã hủy", async () => {
    const { chuongTrinh, hocPhans } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const khoa = await taoKhoa(chuongTrinh.id);
    const gv = await taoGiangVien();

    await phanCongGiangVien({ khoaId: khoa.id, hocPhanId: hocPhans[0].id, giangVienId: gv.id });
    await thietLapBuoiHoc({
      khoaId: khoa.id,
      hocPhanId: hocPhans[0].id,
      ngayHoc: "2026-10-23",
      gioBatDau: "08:00",
      gioKetThuc: "10:00",
    });
    await chuyenTrangThaiKhoa(khoa.id, "HUY");

    expect(await lichDayGiangVien(gv.id)).toEqual([]);
  });

  it("lichDayGiangVien trả về mảng rỗng khi giảng viên chưa được phân công học phần nào", async () => {
    const gv = await taoGiangVien();
    expect(await lichDayGiangVien(gv.id)).toEqual([]);
  });

  it("chặn xếp thời khóa biểu cho khóa Phương thức 3 (chỉ dự thi, không giảng dạy/điểm danh)", async () => {
    const { chuongTrinh } = await taoChuongTrinhDaBanHanhVoiHocPhan();
    await prisma.chuongTrinh.update({ where: { id: chuongTrinh.id }, data: { phuongThucDangKy: "CHI_DU_THI" } });
    const khoa = await taoKhoa(chuongTrinh.id);
    await expect(thietLapBuoiHoc({ khoaId: khoa.id, ngayHoc: "2026-12-05" })).rejects.toThrow(
      KhoaChiDuThiKhongGiangDayError,
    );
    expect(await prisma.buoiHoc.count({ where: { khoaId: khoa.id } })).toBe(0);
  });

  it("buổi đã hủy (GD-03) không còn chiếm phòng và lịch giảng viên - xếp học bù vào đúng khung giờ đó được", async () => {
    const { chuongTrinh: ct1, hocPhans: hp1 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const { chuongTrinh: ct2, hocPhans: hp2 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const khoa1 = await taoKhoa(ct1.id);
    const khoa2 = await taoKhoa(ct2.id);
    const gv = await taoGiangVien();
    const phong = await taoPhongHoc();
    await phanCongGiangVien({ khoaId: khoa1.id, hocPhanId: hp1[0].id, giangVienId: gv.id });
    await phanCongGiangVien({ khoaId: khoa2.id, hocPhanId: hp2[0].id, giangVienId: gv.id });

    const buoiHuy = await thietLapBuoiHoc({
      khoaId: khoa1.id,
      hocPhanId: hp1[0].id,
      ngayHoc: "2026-10-20",
      gioBatDau: "08:00",
      gioKetThuc: "10:00",
      phongHocId: phong.id,
    });
    const khungGio = { ngayHoc: "2026-10-20", gioBatDau: "08:00", gioKetThuc: "10:00", phongHocId: phong.id };
    // còn hiệu lực -> chặn cả trùng phòng lẫn trùng giảng viên
    await expect(thietLapBuoiHoc({ khoaId: khoa2.id, hocPhanId: hp2[0].id, ...khungGio })).rejects.toThrow();

    await prisma.buoiHoc.update({ where: { id: buoiHuy.id }, data: { daHuy: true } });
    const hocBu = await thietLapBuoiHoc({ khoaId: khoa2.id, hocPhanId: hp2[0].id, ...khungGio });
    expect(hocBu.phongHocId).toBe(phong.id);
  });
});

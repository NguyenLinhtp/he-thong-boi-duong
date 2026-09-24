import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { phanCongGiangVien, danhSachPhanCong } from "@/server/services/kh/kh-02-phan-cong-giang-vien";
import {
  KhongTimThayKhoaError,
  KhongTimThayGiangVienError,
  HocPhanKhongThuocChuongTrinhError,
  TrungLichGiangVienError,
} from "@/server/services/kh/loi-khoa";

const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];
const giangVienTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.giangVienHocPhan.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.giangVien.deleteMany({ where: { id: { in: giangVienTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoChuongTrinhDaBanHanhVoiHocPhan(soHocPhan = 1) {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_KH02_${crypto.randomUUID()}`, ten: "Loại hình test KH-02" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_KH02_${crypto.randomUUID()}`,
      ten: "Chương trình test KH-02",
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
    data: { trangThai: "DA_BAN_HANH", soQuyetDinh: "QD-KH02", ngayBanHanh: new Date() },
  });

  return { chuongTrinh: ctDaBanHanh, hocPhans };
}

async function taoKhoa(chuongTrinhId: string, batDau: string, ketThuc: string) {
  const khoa = await khoiTaoKhoa({
    chuongTrinhId,
    siSoToiDa: 30,
    thoiGianKhaiGiang: batDau,
    thoiGianBeGiang: ketThuc,
  });
  khoaTaoTrongTest.push(khoa.id);
  return khoa;
}

async function taoGiangVien(hoTen = "Giảng viên test") {
  const gv = await prisma.giangVien.create({ data: { hoTen } });
  giangVienTaoTrongTest.push(gv.id);
  return gv;
}

describe("KH-02 phân công giảng viên phụ trách học phần", () => {
  it("phân công thành công, danh sách phân công phản ánh đúng", async () => {
    const { chuongTrinh, hocPhans } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const khoa = await taoKhoa(chuongTrinh.id, "2026-10-01", "2026-12-01");
    const gv = await taoGiangVien();

    const phanCong = await phanCongGiangVien({
      khoaId: khoa.id,
      hocPhanId: hocPhans[0].id,
      giangVienId: gv.id,
    });

    expect(phanCong.giangVienId).toBe(gv.id);
    expect(phanCong.hocPhanId).toBe(hocPhans[0].id);

    const ds = await danhSachPhanCong(khoa.id);
    expect(ds).toHaveLength(1);
    expect(ds[0].giangVien.id).toBe(gv.id);
  });

  it("chặn khi học phần không thuộc chương trình của khóa", async () => {
    const { chuongTrinh: ct1 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const { hocPhans: hocPhansCt2 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const khoa = await taoKhoa(ct1.id, "2026-10-01", "2026-12-01");
    const gv = await taoGiangVien();

    await expect(
      phanCongGiangVien({ khoaId: khoa.id, hocPhanId: hocPhansCt2[0].id, giangVienId: gv.id }),
    ).rejects.toThrow(HocPhanKhongThuocChuongTrinhError);
  });

  it("chặn khi giảng viên đã phân công ở khóa khác trùng thời gian", async () => {
    const { chuongTrinh: ct1, hocPhans: hp1 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const { chuongTrinh: ct2, hocPhans: hp2 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const khoa1 = await taoKhoa(ct1.id, "2026-10-01", "2026-12-01");
    const khoa2 = await taoKhoa(ct2.id, "2026-11-01", "2027-01-01");
    const gv = await taoGiangVien();

    await phanCongGiangVien({ khoaId: khoa1.id, hocPhanId: hp1[0].id, giangVienId: gv.id });

    await expect(
      phanCongGiangVien({ khoaId: khoa2.id, hocPhanId: hp2[0].id, giangVienId: gv.id }),
    ).rejects.toThrow(TrungLichGiangVienError);
  });

  it("cho phép phân công 2 khóa không trùng thời gian", async () => {
    const { chuongTrinh: ct1, hocPhans: hp1 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const { chuongTrinh: ct2, hocPhans: hp2 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const khoa1 = await taoKhoa(ct1.id, "2026-10-01", "2026-11-01");
    const khoa2 = await taoKhoa(ct2.id, "2026-12-01", "2027-01-01");
    const gv = await taoGiangVien();

    await phanCongGiangVien({ khoaId: khoa1.id, hocPhanId: hp1[0].id, giangVienId: gv.id });
    const phanCong2 = await phanCongGiangVien({
      khoaId: khoa2.id,
      hocPhanId: hp2[0].id,
      giangVienId: gv.id,
    });

    expect(phanCong2.giangVienId).toBe(gv.id);
  });

  it("không chặn trùng lịch khi 1 trong 2 khóa chưa thiết lập đủ ngày khai/bế giảng", async () => {
    const { chuongTrinh: ct1, hocPhans: hp1 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const { chuongTrinh: ct2, hocPhans: hp2 } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const khoa1 = await khoiTaoKhoa({ chuongTrinhId: ct1.id, siSoToiDa: 30 });
    khoaTaoTrongTest.push(khoa1.id);
    const khoa2 = await taoKhoa(ct2.id, "2026-10-01", "2026-12-01");
    const gv = await taoGiangVien();

    await phanCongGiangVien({ khoaId: khoa1.id, hocPhanId: hp1[0].id, giangVienId: gv.id });
    const phanCong2 = await phanCongGiangVien({
      khoaId: khoa2.id,
      hocPhanId: hp2[0].id,
      giangVienId: gv.id,
    });

    expect(phanCong2.giangVienId).toBe(gv.id);
  });

  it("không tìm thấy khóa", async () => {
    const { hocPhans } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const gv = await taoGiangVien();

    await expect(
      phanCongGiangVien({ khoaId: "khong-ton-tai", hocPhanId: hocPhans[0].id, giangVienId: gv.id }),
    ).rejects.toThrow(KhongTimThayKhoaError);
  });

  it("không tìm thấy giảng viên", async () => {
    const { chuongTrinh, hocPhans } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const khoa = await taoKhoa(chuongTrinh.id, "2026-10-01", "2026-12-01");

    await expect(
      phanCongGiangVien({ khoaId: khoa.id, hocPhanId: hocPhans[0].id, giangVienId: "khong-ton-tai" }),
    ).rejects.toThrow(KhongTimThayGiangVienError);
  });

  it("phân công lại học phần đã có người phụ trách thì cập nhật giảng viên mới", async () => {
    const { chuongTrinh, hocPhans } = await taoChuongTrinhDaBanHanhVoiHocPhan(1);
    const khoa = await taoKhoa(chuongTrinh.id, "2026-10-01", "2026-12-01");
    const gv1 = await taoGiangVien("Giảng viên 1");
    const gv2 = await taoGiangVien("Giảng viên 2");

    await phanCongGiangVien({ khoaId: khoa.id, hocPhanId: hocPhans[0].id, giangVienId: gv1.id });
    const phanCongMoi = await phanCongGiangVien({
      khoaId: khoa.id,
      hocPhanId: hocPhans[0].id,
      giangVienId: gv2.id,
    });

    expect(phanCongMoi.giangVienId).toBe(gv2.id);
    const ds = await danhSachPhanCong(khoa.id);
    expect(ds).toHaveLength(1);
  });
});

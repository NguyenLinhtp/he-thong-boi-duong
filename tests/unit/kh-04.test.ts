import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { thietLapBuoiHoc } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import {
  thietLapHinhThucGiangDay,
  tuDongTaoLinkTrucTuyen,
  tinhTrangLinkTrucTuyen,
  xacNhanSanSangTrucTuyen,
} from "@/server/services/kh/kh-04-hinh-thuc-giang-day";
import {
  KhongTimThayKhoaError,
  KhoaKhongPhaiTrucTuyenError,
  ThieuLinkTrucTuyenError,
} from "@/server/services/kh/loi-khoa";

const loaiHinhTaoTrongTest: string[] = [];
const chuongTrinhTaoTrongTest: string[] = [];
const khoaTaoTrongTest: string[] = [];

afterAll(async () => {
  await prisma.buoiHoc.deleteMany({ where: { khoaId: { in: khoaTaoTrongTest } } });
  await prisma.khoa.deleteMany({ where: { id: { in: khoaTaoTrongTest } } });
  await prisma.chuongTrinh.deleteMany({ where: { id: { in: chuongTrinhTaoTrongTest } } });
  await prisma.loaiHinhBoiDuong.deleteMany({ where: { id: { in: loaiHinhTaoTrongTest } } });
});

async function taoKhoa() {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_KH04_${crypto.randomUUID()}`, ten: "Loại hình test KH-04" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_KH04_${crypto.randomUUID()}`,
      ten: "Chương trình test KH-04",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-KH04",
      ngayBanHanh: new Date(),
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 30 });
  khoaTaoTrongTest.push(khoa.id);
  return khoa;
}

describe("KH-04 thiết lập hình thức giảng dạy", () => {
  it("mặc định khóa là trực tiếp, tình trạng link không áp dụng", async () => {
    const khoa = await taoKhoa();
    const tinhTrang = await tinhTrangLinkTrucTuyen(khoa.id);
    expect(tinhTrang.apDung).toBe(false);
  });

  it("chuyển khóa sang trực tuyến thành công", async () => {
    const khoa = await taoKhoa();
    const ketQua = await thietLapHinhThucGiangDay(khoa.id, "TRUC_TUYEN");
    expect(ketQua.hinhThucGiangDay).toBe("TRUC_TUYEN");
  });

  it("không tìm thấy khóa khi thiết lập hình thức", async () => {
    await expect(thietLapHinhThucGiangDay("khong-ton-tai", "TRUC_TUYEN")).rejects.toThrow(
      KhongTimThayKhoaError,
    );
  });

  it("khóa trực tuyến chưa có buổi học nào thì chưa đủ điều kiện, tự động tạo link báo 0 buổi", async () => {
    const khoa = await taoKhoa();
    await thietLapHinhThucGiangDay(khoa.id, "TRUC_TUYEN");

    const tinhTrang = await tinhTrangLinkTrucTuyen(khoa.id);
    expect(tinhTrang).toMatchObject({ apDung: true, tongBuoi: 0, daDu: false });

    const soDaGan = await tuDongTaoLinkTrucTuyen(khoa.id);
    expect(soDaGan).toBe(0);
  });

  it("tự động tạo link gán cho mọi buổi chưa có link, mỗi buổi 1 link riêng", async () => {
    const khoa = await taoKhoa();
    await thietLapHinhThucGiangDay(khoa.id, "TRUC_TUYEN");
    const buoi1 = await thietLapBuoiHoc({ khoaId: khoa.id, ngayHoc: "2026-10-10" });
    const buoi2 = await thietLapBuoiHoc({ khoaId: khoa.id, ngayHoc: "2026-10-11" });

    const soDaGan = await tuDongTaoLinkTrucTuyen(khoa.id);
    expect(soDaGan).toBe(2);

    const buoi1Sau = await prisma.buoiHoc.findUnique({ where: { id: buoi1.id } });
    const buoi2Sau = await prisma.buoiHoc.findUnique({ where: { id: buoi2.id } });
    expect(buoi1Sau?.linkTrucTuyen).toBeTruthy();
    expect(buoi2Sau?.linkTrucTuyen).toBeTruthy();
    expect(buoi1Sau?.linkTrucTuyen).not.toBe(buoi2Sau?.linkTrucTuyen);

    const tinhTrang = await tinhTrangLinkTrucTuyen(khoa.id);
    expect(tinhTrang).toMatchObject({ apDung: true, tongBuoi: 2, buoiThieuLink: 0, daDu: true });
    await expect(xacNhanSanSangTrucTuyen(khoa.id)).resolves.toBeUndefined();
  });

  it("không ghi đè link đã dán tay khi tự động tạo cho các buổi còn thiếu", async () => {
    const khoa = await taoKhoa();
    await thietLapHinhThucGiangDay(khoa.id, "TRUC_TUYEN");
    const buoiDaCoLink = await thietLapBuoiHoc({
      khoaId: khoa.id,
      ngayHoc: "2026-10-12",
      linkTrucTuyen: "https://zoom.us/j/da-dan-tay",
    });
    await thietLapBuoiHoc({ khoaId: khoa.id, ngayHoc: "2026-10-13" });

    const soDaGan = await tuDongTaoLinkTrucTuyen(khoa.id);
    expect(soDaGan).toBe(1);

    const buoiSau = await prisma.buoiHoc.findUnique({ where: { id: buoiDaCoLink.id } });
    expect(buoiSau?.linkTrucTuyen).toBe("https://zoom.us/j/da-dan-tay");
  });

  it("chặn tự động tạo link khi khóa không ở hình thức trực tuyến", async () => {
    const khoa = await taoKhoa();
    await expect(tuDongTaoLinkTrucTuyen(khoa.id)).rejects.toThrow(KhoaKhongPhaiTrucTuyenError);
  });

  it("xác nhận sẵn sàng trực tuyến báo lỗi khi còn buổi thiếu link", async () => {
    const khoa = await taoKhoa();
    await thietLapHinhThucGiangDay(khoa.id, "TRUC_TUYEN");
    await thietLapBuoiHoc({ khoaId: khoa.id, ngayHoc: "2026-10-14" });

    await expect(xacNhanSanSangTrucTuyen(khoa.id)).rejects.toThrow(ThieuLinkTrucTuyenError);
  });

  it("xác nhận sẵn sàng trực tuyến không chặn khóa trực tiếp", async () => {
    const khoa = await taoKhoa();
    await expect(xacNhanSanSangTrucTuyen(khoa.id)).resolves.toBeUndefined();
  });
});

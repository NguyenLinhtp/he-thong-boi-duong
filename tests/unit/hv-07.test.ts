import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import {
  xetDuyetDanhSachChinhThuc,
  danhSachHopLeChoXetDuyet,
  danhSachChinhThuc,
} from "@/server/services/hv/hv-07-xet-duyet-chinh-thuc";
import {
  KhongTimThayKhoaError,
  DanhSachXetDuyetRongError,
  DanhSachXetDuyetKhongHopLeError,
  VuotSiSoKhiXetDuyetError,
} from "@/server/services/hv/loi-hoc-vien";

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

async function taoKhoaVoiHoSoHopLe(soLuong: number, siSoToiDa = 10) {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_HV07_${crypto.randomUUID()}`, ten: "Loại hình test HV-07" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_HV07_${crypto.randomUUID()}`,
      ten: "Chương trình test HV-07",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-HV07",
      ngayBanHanh: new Date(),
      phuongThucDangKys: ["CHI_DU_THI"],
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa });
  khoaTaoTrongTest.push(khoa.id);
  await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");

  // Tạo trực tiếp qua prisma (bỏ qua cổng coTheNhanDangKy của HV-05) để mô
  // phỏng được cả trường hợp số hồ sơ hợp lệ vượt sĩ số tối đa - kiểm tra
  // đúng cổng chặn riêng của HV-07, không phụ thuộc luồng đăng ký công khai.
  const dsHopLe = [];
  for (let i = 0; i < soLuong; i++) {
    const hv = await prisma.hocVien.create({
      data: { maHocVien: `HV_HV07_${crypto.randomUUID()}`, hoTen: `Học viên ${i + 1}` },
    });
    hocVienTaoTrongTest.push(hv.id);
    const dk = await prisma.dangKyHoc.create({
      data: { hocVienId: hv.id, khoaId: khoa.id, trangThai: "HOP_LE" },
    });
    dsHopLe.push(dk);
  }

  return { khoa, dsHopLe };
}

describe("HV-07 xét duyệt danh sách chính thức", () => {
  it("duyệt thành công toàn bộ hồ sơ hợp lệ trong sĩ số", async () => {
    const { khoa, dsHopLe } = await taoKhoaVoiHoSoHopLe(2);
    const ketQua = await xetDuyetDanhSachChinhThuc(
      khoa.id,
      dsHopLe.map((dk) => dk.id),
    );

    expect(ketQua.every((dk) => dk.trangThai === "CHINH_THUC")).toBe(true);

    const dsChinhThuc = await danhSachChinhThuc(khoa.id);
    expect(dsChinhThuc).toHaveLength(2);
  });

  it("chỉ duyệt hồ sơ được chọn, hồ sơ hợp lệ khác không bị ảnh hưởng", async () => {
    const { khoa, dsHopLe } = await taoKhoaVoiHoSoHopLe(2);
    await xetDuyetDanhSachChinhThuc(khoa.id, [dsHopLe[0].id]);

    const conHopLe = await danhSachHopLeChoXetDuyet(khoa.id);
    expect(conHopLe.map((dk) => dk.id)).toEqual([dsHopLe[1].id]);
  });

  it("chặn khi danh sách chọn rỗng", async () => {
    const { khoa } = await taoKhoaVoiHoSoHopLe(1);
    await expect(xetDuyetDanhSachChinhThuc(khoa.id, [])).rejects.toThrow(DanhSachXetDuyetRongError);
  });

  it("chặn khi có id không phải Hợp lệ hoặc không thuộc khóa này", async () => {
    const { khoa, dsHopLe } = await taoKhoaVoiHoSoHopLe(1);
    await expect(
      xetDuyetDanhSachChinhThuc(khoa.id, [dsHopLe[0].id, "khong-ton-tai"]),
    ).rejects.toThrow(DanhSachXetDuyetKhongHopLeError);
  });

  it("chặn khi số lượng duyệt vượt sĩ số tối đa", async () => {
    const { khoa, dsHopLe } = await taoKhoaVoiHoSoHopLe(3, 2);
    await expect(
      xetDuyetDanhSachChinhThuc(
        khoa.id,
        dsHopLe.map((dk) => dk.id),
      ),
    ).rejects.toThrow(VuotSiSoKhiXetDuyetError);
  });

  it("tính đúng chỗ còn lại khi đã có sẵn chính thức từ trước (chia nhiều đợt duyệt)", async () => {
    const { khoa, dsHopLe } = await taoKhoaVoiHoSoHopLe(3, 2);
    await xetDuyetDanhSachChinhThuc(khoa.id, [dsHopLe[0].id]);

    await expect(
      xetDuyetDanhSachChinhThuc(khoa.id, [dsHopLe[1].id, dsHopLe[2].id]),
    ).rejects.toThrow(VuotSiSoKhiXetDuyetError);

    const ketQua = await xetDuyetDanhSachChinhThuc(khoa.id, [dsHopLe[1].id]);
    expect(ketQua[0].trangThai).toBe("CHINH_THUC");
  });

  it("không tìm thấy khóa", async () => {
    await expect(xetDuyetDanhSachChinhThuc("khong-ton-tai", ["x"])).rejects.toThrow(
      KhongTimThayKhoaError,
    );
  });

  it("2 lô duyệt đồng thời không cùng lọt qua kiểm tra sĩ số (còn 2 chỗ, mỗi lô 2 người)", async () => {
    const { khoa, dsHopLe } = await taoKhoaVoiHoSoHopLe(4, 2);
    const ketQua = await Promise.allSettled([
      xetDuyetDanhSachChinhThuc(khoa.id, [dsHopLe[0].id, dsHopLe[1].id]),
      xetDuyetDanhSachChinhThuc(khoa.id, [dsHopLe[2].id, dsHopLe[3].id]),
    ]);
    expect(ketQua.filter((k) => k.status === "fulfilled")).toHaveLength(1);
    const biChan = ketQua.find((k) => k.status === "rejected") as PromiseRejectedResult;
    expect(biChan.reason).toBeInstanceOf(VuotSiSoKhiXetDuyetError);
    expect(await prisma.dangKyHoc.count({ where: { khoaId: khoa.id, trangThai: "CHINH_THUC" } })).toBe(2);
  });
});

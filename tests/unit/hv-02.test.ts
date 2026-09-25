import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { dangKyTrucTuyen } from "@/server/services/hv/hv-01-dang-ky-truc-tuyen";
import { xacNhanNopGiay, danhSachChoNopGiay } from "@/server/services/hv/hv-02-xac-nhan-nop-giay";
import {
  KhongTimThayDangKyError,
  SaiTrangThaiXacNhanNopGiayError,
  DaQuaHanNopGiayError,
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

async function taoKhoaDangTuyenSinh(siSoToiDa = 10) {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_HV02_${crypto.randomUUID()}`, ten: "Loại hình test HV-02" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_HV02_${crypto.randomUUID()}`,
      ten: "Chương trình test HV-02",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-HV02",
      ngayBanHanh: new Date(),
      phuongThucDangKy: "TRUC_TUYEN_NOP_GIAY",
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa });
  khoaTaoTrongTest.push(khoa.id);
  await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
  return khoa;
}

async function taoDangKy(khoaId: string) {
  const dk = await dangKyTrucTuyen({
    khoaId,
    hoTen: "Học viên test",
    soCCCD: `CCCD_${crypto.randomUUID()}`,
  });
  hocVienTaoTrongTest.push(dk.hocVienId);
  return dk;
}

describe("HV-02 xác nhận đã nhận hồ sơ giấy (Phương thức 1)", () => {
  it("xác nhận thành công, chuyển trạng thái sang đã nộp giấy - chờ duyệt", async () => {
    const khoa = await taoKhoaDangTuyenSinh();
    const dk = await taoDangKy(khoa.id);

    const ketQua = await xacNhanNopGiay(dk.id);
    expect(ketQua.trangThai).toBe("DA_NOP_GIAY");
  });

  it("chặn xác nhận khi hồ sơ đã ở trạng thái khác (đã xác nhận rồi)", async () => {
    const khoa = await taoKhoaDangTuyenSinh();
    const dk = await taoDangKy(khoa.id);
    await xacNhanNopGiay(dk.id);

    await expect(xacNhanNopGiay(dk.id)).rejects.toThrow(SaiTrangThaiXacNhanNopGiayError);
  });

  it("không tìm thấy hồ sơ", async () => {
    await expect(xacNhanNopGiay("khong-ton-tai")).rejects.toThrow(KhongTimThayDangKyError);
  });

  it("tự động hủy khi quá hạn nộp giấy, chặn xác nhận sau khi đã quá hạn", async () => {
    const khoa = await taoKhoaDangTuyenSinh();
    const dk = await taoDangKy(khoa.id);

    // giả lập đã quá hạn nộp giấy (hạn đặt lùi về quá khứ)
    await prisma.dangKyHoc.update({
      where: { id: dk.id },
      data: { hanNopGiay: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    await expect(xacNhanNopGiay(dk.id)).rejects.toThrow(DaQuaHanNopGiayError);

    const sau = await prisma.dangKyHoc.findUnique({ where: { id: dk.id } });
    expect(sau?.trangThai).toBe("HUY_QUA_HAN_NOP_GIAY");
  });

  it("danhSachChoNopGiay chỉ trả về hồ sơ còn thực sự chờ, tự loại hồ sơ đã quá hạn", async () => {
    const khoa = await taoKhoaDangTuyenSinh();
    const dkConHan = await taoDangKy(khoa.id);
    const dkQuaHan = await taoDangKy(khoa.id);
    await prisma.dangKyHoc.update({
      where: { id: dkQuaHan.id },
      data: { hanNopGiay: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    const ds = await danhSachChoNopGiay(khoa.id);
    expect(ds.map((dk) => dk.id)).toContain(dkConHan.id);
    expect(ds.map((dk) => dk.id)).not.toContain(dkQuaHan.id);

    const dkQuaHanSau = await prisma.dangKyHoc.findUnique({ where: { id: dkQuaHan.id } });
    expect(dkQuaHanSau?.trangThai).toBe("HUY_QUA_HAN_NOP_GIAY");
  });

  it("không tự hủy hồ sơ còn hạn (hanNopGiay ở tương lai)", async () => {
    const khoa = await taoKhoaDangTuyenSinh();
    const dk = await taoDangKy(khoa.id);

    const ds = await danhSachChoNopGiay(khoa.id);
    expect(ds.map((d) => d.id)).toContain(dk.id);
  });
});

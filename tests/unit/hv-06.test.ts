import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { dangKyDuThi } from "@/server/services/hv/hv-05-dang-ky-du-thi";
import {
  thamDinhHoSo,
  danhSachChoThamDinh,
  danhSachDaThamDinh,
} from "@/server/services/hv/hv-06-tham-dinh";
import { KhongTimThayDangKyError, SaiTrangThaiThamDinhError } from "@/server/services/hv/loi-hoc-vien";

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

async function taoDangKyChoDuyet() {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_HV06_${crypto.randomUUID()}`, ten: "Loại hình test HV-06" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_HV06_${crypto.randomUUID()}`,
      ten: "Chương trình test HV-06",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-HV06",
      ngayBanHanh: new Date(),
      phuongThucDangKy: "CHI_DU_THI",
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 10 });
  khoaTaoTrongTest.push(khoa.id);
  await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");

  const dangKy = await dangKyDuThi({
    khoaId: khoa.id,
    hoTen: "Học viên test",
    soCCCD: `CCCD_${crypto.randomUUID()}`,
  });
  hocVienTaoTrongTest.push(dangKy.hocVienId);

  return { khoa, dangKy };
}

describe("HV-06 kiểm tra, thẩm định hồ sơ đăng ký", () => {
  it("đánh dấu Hợp lệ thành công từ trạng thái Chờ duyệt", async () => {
    const { dangKy } = await taoDangKyChoDuyet();
    const ketQua = await thamDinhHoSo(dangKy.id, "HOP_LE");
    expect(ketQua.trangThai).toBe("HOP_LE");
  });

  it("đánh dấu Không hợp lệ kèm ghi chú lý do", async () => {
    const { dangKy } = await taoDangKyChoDuyet();
    const ketQua = await thamDinhHoSo(dangKy.id, "KHONG_HOP_LE", "Thiếu bằng cấp theo yêu cầu");
    expect(ketQua.trangThai).toBe("KHONG_HOP_LE");
    expect(ketQua.ghiChuThamDinh).toBe("Thiếu bằng cấp theo yêu cầu");
  });

  it("cho phép thẩm định lại để sửa kết quả trước đó", async () => {
    const { dangKy } = await taoDangKyChoDuyet();
    await thamDinhHoSo(dangKy.id, "KHONG_HOP_LE", "Nhầm lẫn");
    const ketQuaMoi = await thamDinhHoSo(dangKy.id, "HOP_LE");
    expect(ketQuaMoi.trangThai).toBe("HOP_LE");
  });

  it("chặn thẩm định hồ sơ chưa hoàn tất đăng ký (còn ở chờ nộp giấy/chờ tự xác nhận)", async () => {
    const lh = await prisma.loaiHinhBoiDuong.create({
      data: { ma: `LH_HV06b_${crypto.randomUUID()}`, ten: "Loại hình test HV-06b" },
    });
    loaiHinhTaoTrongTest.push(lh.id);
    const ct = await prisma.chuongTrinh.create({
      data: {
        maCT: `CT_HV06b_${crypto.randomUUID()}`,
        ten: "CT test HV-06b",
        loaiHinhBoiDuongId: lh.id,
        trangThai: "DA_BAN_HANH",
        soQuyetDinh: "QD",
        ngayBanHanh: new Date(),
        phuongThucDangKy: "TRUC_TUYEN_NOP_GIAY",
      },
    });
    chuongTrinhTaoTrongTest.push(ct.id);
    const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 10 });
    khoaTaoTrongTest.push(khoa.id);
    const hv = await prisma.hocVien.create({
      data: { maHocVien: `HV_HV06b_${crypto.randomUUID()}`, hoTen: "X" },
    });
    hocVienTaoTrongTest.push(hv.id);
    const dangKy = await prisma.dangKyHoc.create({
      data: { hocVienId: hv.id, khoaId: khoa.id, trangThai: "CHO_NOP_GIAY" },
    });

    await expect(thamDinhHoSo(dangKy.id, "HOP_LE")).rejects.toThrow(SaiTrangThaiThamDinhError);
  });

  it("chặn thẩm định hồ sơ đã CHINH_THUC (đã qua HV-07)", async () => {
    const { dangKy } = await taoDangKyChoDuyet();
    await prisma.dangKyHoc.update({ where: { id: dangKy.id }, data: { trangThai: "CHINH_THUC" } });

    await expect(thamDinhHoSo(dangKy.id, "HOP_LE")).rejects.toThrow(SaiTrangThaiThamDinhError);
  });

  it("không tìm thấy hồ sơ", async () => {
    await expect(thamDinhHoSo("khong-ton-tai", "HOP_LE")).rejects.toThrow(KhongTimThayDangKyError);
  });

  it("danhSachChoThamDinh và danhSachDaThamDinh phản ánh đúng trạng thái", async () => {
    const { khoa, dangKy } = await taoDangKyChoDuyet();

    let choThamDinh = await danhSachChoThamDinh(khoa.id);
    expect(choThamDinh.map((dk) => dk.id)).toContain(dangKy.id);

    await thamDinhHoSo(dangKy.id, "HOP_LE");

    choThamDinh = await danhSachChoThamDinh(khoa.id);
    expect(choThamDinh.map((dk) => dk.id)).not.toContain(dangKy.id);

    const daThamDinh = await danhSachDaThamDinh(khoa.id);
    expect(daThamDinh.map((dk) => dk.id)).toContain(dangKy.id);
  });
});

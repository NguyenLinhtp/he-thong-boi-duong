import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { importDanhSachHocVien } from "@/server/services/hv/hv-03-import-danh-sach";
import { xacNhanThamGia } from "@/server/services/hv/hv-04-tu-xac-nhan";
import {
  KhongTimThayKhoaError,
  KhongKhopDuLieuImportError,
  DaXacNhanThamGiaError,
  KhoaChuaMoXacNhanThamGiaError,
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

async function taoKhoaDaImport(soHocVien = 1, siSoToiDa = 10) {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_HV04_${crypto.randomUUID()}`, ten: "Loại hình test HV-04" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_HV04_${crypto.randomUUID()}`,
      ten: "Chương trình test HV-04",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-HV04",
      ngayBanHanh: new Date(),
      phuongThucDangKy: "IMPORT_TU_XAC_NHAN",
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa });
  khoaTaoTrongTest.push(khoa.id);

  const cccds = Array.from({ length: soHocVien }, () => crypto.randomUUID());
  const csv = [
    "hoTen,soCCCD",
    ...cccds.map((cccd, i) => `Học viên ${i + 1},${cccd}`),
  ].join("\n");
  const dsDangKy = await importDanhSachHocVien(khoa.id, csv);
  dsDangKy.forEach((dk) => hocVienTaoTrongTest.push(dk.hocVienId));

  return { khoa, cccds };
}

describe("HV-04 học viên tự xác nhận tham gia (Phương thức 2)", () => {
  it("xác nhận thành công khi CCCD khớp dữ liệu đã import và khóa Đang tuyển sinh", async () => {
    const { khoa, cccds } = await taoKhoaDaImport(1);
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");

    const ketQua = await xacNhanThamGia({ khoaId: khoa.id, soCCCD: cccds[0] });
    expect(ketQua.trangThai).toBe("DA_XAC_NHAN_THAM_GIA");
  });

  it("bổ sung thông tin còn thiếu (số điện thoại/email) khi xác nhận", async () => {
    const { khoa, cccds } = await taoKhoaDaImport(1);
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");

    const ketQua = await xacNhanThamGia({
      khoaId: khoa.id,
      soCCCD: cccds[0],
      soDienThoai: "0900000099",
      email: "hv@example.com",
    });

    expect(ketQua.hocVien.soDienThoai).toBe("0900000099");
    expect(ketQua.hocVien.email).toBe("hv@example.com");
  });

  it("không ghi đè thông tin đã có sẵn từ lúc import", async () => {
    const lh = await prisma.loaiHinhBoiDuong.create({
      data: { ma: `LH_HV04b_${crypto.randomUUID()}`, ten: "Loại hình test HV-04b" },
    });
    loaiHinhTaoTrongTest.push(lh.id);
    const ct = await prisma.chuongTrinh.create({
      data: {
        maCT: `CT_HV04b_${crypto.randomUUID()}`,
        ten: "CT test HV-04b",
        loaiHinhBoiDuongId: lh.id,
        trangThai: "DA_BAN_HANH",
        soQuyetDinh: "QD",
        ngayBanHanh: new Date(),
        phuongThucDangKy: "IMPORT_TU_XAC_NHAN",
      },
    });
    chuongTrinhTaoTrongTest.push(ct.id);
    const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa: 10 });
    khoaTaoTrongTest.push(khoa.id);

    const cccd = crypto.randomUUID();
    const dsDangKy = await importDanhSachHocVien(
      khoa.id,
      ["hoTen,soCCCD,donViCongTac,soDienThoai,email", `A,${cccd},Trường A,0911111111,cu@example.com`].join(
        "\n",
      ),
    );
    dsDangKy.forEach((dk) => hocVienTaoTrongTest.push(dk.hocVienId));
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");

    const ketQua = await xacNhanThamGia({
      khoaId: khoa.id,
      soCCCD: cccd,
      soDienThoai: "0999999999",
      email: "moi@example.com",
    });

    expect(ketQua.hocVien.soDienThoai).toBe("0911111111");
    expect(ketQua.hocVien.email).toBe("cu@example.com");
  });

  it("chặn khi CCCD không khớp dữ liệu đã import", async () => {
    const { khoa } = await taoKhoaDaImport(1);
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");

    await expect(
      xacNhanThamGia({ khoaId: khoa.id, soCCCD: "khong-ton-tai" }),
    ).rejects.toThrow(KhongKhopDuLieuImportError);
  });

  it("chặn xác nhận trùng lần 2", async () => {
    const { khoa, cccds } = await taoKhoaDaImport(1);
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
    await xacNhanThamGia({ khoaId: khoa.id, soCCCD: cccds[0] });

    await expect(xacNhanThamGia({ khoaId: khoa.id, soCCCD: cccds[0] })).rejects.toThrow(
      DaXacNhanThamGiaError,
    );
  });

  it("chặn khi khóa chưa mở tuyển sinh (còn Chuẩn bị)", async () => {
    const { khoa, cccds } = await taoKhoaDaImport(1);

    await expect(
      xacNhanThamGia({ khoaId: khoa.id, soCCCD: cccds[0] }),
    ).rejects.toThrow(KhoaChuaMoXacNhanThamGiaError);
  });

  it("vẫn xác nhận được dù khóa đã đủ sĩ số (chỗ đã giữ sẵn từ import, không phải đăng ký mới)", async () => {
    const { khoa, cccds } = await taoKhoaDaImport(1, 1);
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");

    const ketQua = await xacNhanThamGia({ khoaId: khoa.id, soCCCD: cccds[0] });
    expect(ketQua.trangThai).toBe("DA_XAC_NHAN_THAM_GIA");
  });

  it("không tìm thấy khóa", async () => {
    await expect(
      xacNhanThamGia({ khoaId: "khong-ton-tai", soCCCD: "x" }),
    ).rejects.toThrow(KhongTimThayKhoaError);
  });
});

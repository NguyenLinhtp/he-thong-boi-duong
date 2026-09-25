import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { khoiTaoKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenTrangThaiKhoa } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { importDanhSachHocVien, danhSachChoTuXacNhan } from "@/server/services/hv/hv-03-import-danh-sach";
import {
  KhongTimThayKhoaError,
  SaiPhuongThucDangKyError,
  KhoaKhongConNhanImportError,
  ImportVuotSiSoToiDaError,
  DuLieuImportLoiError,
  FileImportRongError,
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

async function taoKhoa(
  siSoToiDa = 10,
  phuongThucDangKy: "IMPORT_TU_XAC_NHAN" | "TRUC_TUYEN_NOP_GIAY" | null = "IMPORT_TU_XAC_NHAN",
) {
  const lh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_HV03_${crypto.randomUUID()}`, ten: "Loại hình test HV-03" },
  });
  loaiHinhTaoTrongTest.push(lh.id);

  const ct = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_HV03_${crypto.randomUUID()}`,
      ten: "Chương trình test HV-03",
      loaiHinhBoiDuongId: lh.id,
      trangThai: "DA_BAN_HANH",
      soQuyetDinh: "QD-HV03",
      ngayBanHanh: new Date(),
      phuongThucDangKy,
    },
  });
  chuongTrinhTaoTrongTest.push(ct.id);

  const khoa = await khoiTaoKhoa({ chuongTrinhId: ct.id, siSoToiDa });
  khoaTaoTrongTest.push(khoa.id);
  return khoa;
}

function ghiNhanHocVien(dsDangKy: { hocVienId: string }[]) {
  dsDangKy.forEach((dk) => hocVienTaoTrongTest.push(dk.hocVienId));
}

describe("HV-03 import danh sách học viên có sẵn (Phương thức 2)", () => {
  it("import thành công từ CSV hợp lệ (khóa còn Chuẩn bị, trước khi mở đăng ký)", async () => {
    const khoa = await taoKhoa();
    const csv = [
      "hoTen,soCCCD,donViCongTac,soDienThoai,email",
      `Nguyễn Văn A,${crypto.randomUUID()},Trường A,0900000001,a@example.com`,
      `Trần Thị B,${crypto.randomUUID()},Trường B,,`,
    ].join("\n");

    const ketQua = await importDanhSachHocVien(khoa.id, csv);
    ghiNhanHocVien(ketQua);

    expect(ketQua).toHaveLength(2);
    expect(ketQua.every((dk) => dk.trangThai === "CHO_TU_XAC_NHAN")).toBe(true);

    const ds = await danhSachChoTuXacNhan(khoa.id);
    expect(ds).toHaveLength(2);
  });

  it("chặn khi chương trình không cấu hình Phương thức 2", async () => {
    const khoa = await taoKhoa(10, "TRUC_TUYEN_NOP_GIAY");
    const csv = ["hoTen,soCCCD", `A,${crypto.randomUUID()}`].join("\n");

    await expect(importDanhSachHocVien(khoa.id, csv)).rejects.toThrow(SaiPhuongThucDangKyError);
  });

  it("chặn khi khóa đã qua giai đoạn tuyển sinh (Đang diễn ra)", async () => {
    const khoa = await taoKhoa();
    await chuyenTrangThaiKhoa(khoa.id, "DANG_TUYEN_SINH");
    await chuyenTrangThaiKhoa(khoa.id, "DANG_DIEN_RA");
    const csv = ["hoTen,soCCCD", `A,${crypto.randomUUID()}`].join("\n");

    await expect(importDanhSachHocVien(khoa.id, csv)).rejects.toThrow(KhoaKhongConNhanImportError);
  });

  it("báo lỗi chi tiết khi trùng CCCD trong cùng file, không tạo dữ liệu nào", async () => {
    const khoa = await taoKhoa();
    const cccdTrung = crypto.randomUUID();
    const csv = [
      "hoTen,soCCCD",
      `A,${cccdTrung}`,
      `B,${cccdTrung}`,
    ].join("\n");

    await expect(importDanhSachHocVien(khoa.id, csv)).rejects.toThrow(DuLieuImportLoiError);

    const ds = await danhSachChoTuXacNhan(khoa.id);
    expect(ds).toHaveLength(0);
  });

  it("báo lỗi chi tiết khi thiếu họ tên hoặc CCCD, kèm đúng số dòng", async () => {
    const khoa = await taoKhoa();
    const csv = [
      "hoTen,soCCCD",
      `,${crypto.randomUUID()}`,
      "C,",
    ].join("\n");

    try {
      await importDanhSachHocVien(khoa.id, csv);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(DuLieuImportLoiError);
      const loi = (error as InstanceType<typeof DuLieuImportLoiError>).cacDongLoi;
      expect(loi).toEqual([
        { dong: 2, loi: "Thiếu họ tên" },
        { dong: 3, loi: "Thiếu CCCD/mã số" },
      ]);
    }
  });

  it("chặn khi file rỗng (không có dòng dữ liệu)", async () => {
    const khoa = await taoKhoa();
    await expect(importDanhSachHocVien(khoa.id, "hoTen,soCCCD")).rejects.toThrow(FileImportRongError);
  });

  it("chặn khi số dòng import vượt sĩ số còn trống", async () => {
    const khoa = await taoKhoa(1);
    const csv = [
      "hoTen,soCCCD",
      `A,${crypto.randomUUID()}`,
      `B,${crypto.randomUUID()}`,
    ].join("\n");

    await expect(importDanhSachHocVien(khoa.id, csv)).rejects.toThrow(ImportVuotSiSoToiDaError);
  });

  it("báo lỗi khi CCCD đã có trong danh sách của khóa này (import lại)", async () => {
    const khoa = await taoKhoa();
    const cccd = crypto.randomUUID();
    const lan1 = await importDanhSachHocVien(khoa.id, ["hoTen,soCCCD", `A,${cccd}`].join("\n"));
    ghiNhanHocVien(lan1);

    await expect(
      importDanhSachHocVien(khoa.id, ["hoTen,soCCCD", `A,${cccd}`].join("\n")),
    ).rejects.toThrow(DuLieuImportLoiError);
  });

  it("HV-08: CCCD đã tồn tại từ trước (khóa khác) thì dùng lại cùng 1 mã học viên khi import", async () => {
    const khoa1 = await taoKhoa();
    const khoa2 = await taoKhoa();
    const cccd = crypto.randomUUID();

    const lan1 = await importDanhSachHocVien(khoa1.id, ["hoTen,soCCCD", `A,${cccd}`].join("\n"));
    ghiNhanHocVien(lan1);
    const lan2 = await importDanhSachHocVien(khoa2.id, ["hoTen,soCCCD", `A,${cccd}`].join("\n"));

    expect(lan2[0].hocVienId).toBe(lan1[0].hocVienId);
  });

  it("không tìm thấy khóa", async () => {
    await expect(
      importDanhSachHocVien("khong-ton-tai", ["hoTen,soCCCD", `A,${crypto.randomUUID()}`].join("\n")),
    ).rejects.toThrow(KhongTimThayKhoaError);
  });
});

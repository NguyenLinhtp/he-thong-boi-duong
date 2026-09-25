import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { coTheNhanDangKy } from "@/server/services/kh/kh-05-trang-thai-si-so";
import {
  timHoacTaoHocVien,
  SO_NGAY_HAN_NOP_GIAY,
  type ThongTinHocVienInput,
} from "@/server/services/hv/dung-chung";
import {
  KhongTimThayKhoaError,
  SaiPhuongThucDangKyError,
  KhoaKhongMoDangKyError,
  DaDangKyKhoaNayError,
  KhongTimThayDangKyError,
} from "@/server/services/hv/loi-hoc-vien";

export type DangKyTrucTuyenInput = ThongTinHocVienInput & { khoaId: string };

/**
 * HV-01: học viên tự đăng ký trực tuyến (Phương thức 1) - "Chỉ áp dụng cho
 * chương trình cấu hình Phương thức 1; không đăng ký trùng vào 1 khóa quá 1
 * lần". Hồ sơ vào trạng thái "Đã đăng ký online - chờ nộp bản giấy"
 * (CHO_NOP_GIAY), chờ HV-02 xác nhận đã nhận bản giấy.
 */
export async function dangKyTrucTuyen(input: DangKyTrucTuyenInput) {
  const khoa = await prisma.khoa.findUnique({
    where: { id: input.khoaId },
    include: { chuongTrinh: true },
  });
  if (!khoa) throw new KhongTimThayKhoaError();

  if (khoa.chuongTrinh.phuongThucDangKy !== "TRUC_TUYEN_NOP_GIAY") {
    throw new SaiPhuongThucDangKyError("Phương thức 1 (đăng ký trực tuyến kèm nộp bản giấy)");
  }

  const conMo = await coTheNhanDangKy(khoa.id);
  if (!conMo) throw new KhoaKhongMoDangKyError();

  const hocVien = await timHoacTaoHocVien(input);

  const hanNopGiay = new Date();
  hanNopGiay.setDate(hanNopGiay.getDate() + SO_NGAY_HAN_NOP_GIAY);

  try {
    return await prisma.dangKyHoc.create({
      data: { hocVienId: hocVien.id, khoaId: khoa.id, trangThai: "CHO_NOP_GIAY", hanNopGiay },
      include: { hocVien: true, khoa: { include: { chuongTrinh: true } } },
    });
  } catch (error) {
    const laLoiTrungDangKy =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (laLoiTrungDangKy) throw new DaDangKyKhoaNayError();
    throw error;
  }
}

export async function layDangKy(id: string) {
  const dangKy = await prisma.dangKyHoc.findUnique({
    where: { id },
    include: { hocVien: true, khoa: { include: { chuongTrinh: true } } },
  });
  if (!dangKy) throw new KhongTimThayDangKyError();
  return dangKy;
}

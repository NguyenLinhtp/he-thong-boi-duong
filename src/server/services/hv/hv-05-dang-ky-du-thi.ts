import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { coTheNhanDangKy } from "@/server/services/kh/kh-05-trang-thai-si-so";
import { timHoacTaoHocVien, type ThongTinHocVienInput } from "@/server/services/hv/dung-chung";
import {
  KhongTimThayKhoaError,
  SaiPhuongThucDangKyError,
  KhoaKhongMoDangKyError,
  DaDangKyKhoaNayError,
} from "@/server/services/hv/loi-hoc-vien";
import { guiThongBao } from "@/server/services/hv/hv-10-thong-bao";

export type DangKyDuThiInput = ThongTinHocVienInput & { khoaId: string };

/**
 * HV-05 (Phương thức 3): học viên tự đăng ký dự thi cho 1 khóa/đợt thi
 * ("Đợt thi đăng ký" = khóa được chọn), không qua giai đoạn học tập. Không
 * có bước nộp giấy riêng như Phương thức 1 nên hồ sơ vào thẳng CHO_DUYET
 * (mặc định của DangKyHoc), sẵn sàng cho HV-06 thẩm định chung 3 phương
 * thức. "Khóa thuộc Phương thức 3 không áp dụng điểm danh/giảng dạy" - ràng
 * buộc này thuộc phạm vi module GD (Đợt 2), GD phải tự kiểm tra
 * phuongThucDangKy khi được xây dựng, không phải việc của HV-05.
 */
export async function dangKyDuThi(input: DangKyDuThiInput) {
  const khoa = await prisma.khoa.findUnique({
    where: { id: input.khoaId },
    include: { chuongTrinh: true },
  });
  if (!khoa) throw new KhongTimThayKhoaError();

  if (khoa.chuongTrinh.phuongThucDangKy !== "CHI_DU_THI") {
    throw new SaiPhuongThucDangKyError("Phương thức 3 (đăng ký dự thi, không qua học)");
  }

  const conMo = await coTheNhanDangKy(khoa.id);
  if (!conMo) throw new KhoaKhongMoDangKyError();

  const hocVien = await timHoacTaoHocVien(input);

  let dangKy;
  try {
    dangKy = await prisma.dangKyHoc.create({
      data: { hocVienId: hocVien.id, khoaId: khoa.id },
      include: { hocVien: true, khoa: { include: { chuongTrinh: true } } },
    });
  } catch (error) {
    const laLoiTrungDangKy =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (laLoiTrungDangKy) throw new DaDangKyKhoaNayError();
    throw error;
  }

  await guiThongBao(
    hocVien.id,
    "LICH_HOC_LICH_THI",
    `Đăng ký dự thi khóa ${khoa.maKhoa} thành công`,
    `Bạn đã đăng ký dự thi thành công cho khóa ${khoa.maKhoa}. Lịch thi cụ thể sẽ được thông báo sau.`,
  );

  return dangKy;
}

export async function danhSachThiSinh(khoaId: string) {
  return prisma.dangKyHoc.findMany({
    where: { khoaId },
    include: { hocVien: true },
    orderBy: { ngayDangKy: "asc" },
  });
}

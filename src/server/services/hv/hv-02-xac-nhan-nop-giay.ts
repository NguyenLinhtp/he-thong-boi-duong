import { prisma } from "@/lib/db/prisma";
import {
  KhongTimThayDangKyError,
  SaiTrangThaiXacNhanNopGiayError,
  DaQuaHanNopGiayError,
} from "@/server/services/hv/loi-hoc-vien";

const INCLUDE_DANG_KY = {
  hocVien: true,
  khoa: { include: { chuongTrinh: true } },
} as const;

/**
 * HV-02: "hồ sơ không được xác nhận nộp giấy trong thời hạn quy định sẽ tự
 * động hủy đăng ký" - kiểm tra lười (lazy): mỗi lần hồ sơ CHO_NOP_GIAY được
 * đọc/thao tác mà đã quá hanNopGiay thì tự chuyển HUY_QUA_HAN_NOP_GIAY ngay
 * lúc đó, không cần tiến trình nền/cron riêng.
 */
async function tuDongHuyNeuQuaHan(dangKyId: string) {
  const dangKy = await prisma.dangKyHoc.findUnique({
    where: { id: dangKyId },
    include: INCLUDE_DANG_KY,
  });
  if (!dangKy) throw new KhongTimThayDangKyError();

  if (dangKy.trangThai === "CHO_NOP_GIAY" && dangKy.hanNopGiay && dangKy.hanNopGiay < new Date()) {
    return prisma.dangKyHoc.update({
      where: { id: dangKyId },
      data: { trangThai: "HUY_QUA_HAN_NOP_GIAY" },
      include: INCLUDE_DANG_KY,
    });
  }
  return dangKy;
}

export async function xacNhanNopGiay(dangKyId: string) {
  const dangKy = await tuDongHuyNeuQuaHan(dangKyId);

  if (dangKy.trangThai === "HUY_QUA_HAN_NOP_GIAY") throw new DaQuaHanNopGiayError();
  if (dangKy.trangThai !== "CHO_NOP_GIAY") throw new SaiTrangThaiXacNhanNopGiayError();

  return prisma.dangKyHoc.update({
    where: { id: dangKyId },
    data: { trangThai: "DA_NOP_GIAY" },
    include: INCLUDE_DANG_KY,
  });
}

/**
 * Danh sách hồ sơ Phương thức 1 của 1 khóa đang chờ xác nhận nộp giấy - tự
 * lọc bỏ (chuyển trạng thái) các hồ sơ đã quá hạn trước khi trả về, để danh
 * sách hiển thị luôn phản ánh đúng hồ sơ còn thực sự chờ xử lý.
 */
export async function danhSachChoNopGiay(khoaId: string) {
  const dsChoNopGiay = await prisma.dangKyHoc.findMany({
    where: { khoaId, trangThai: "CHO_NOP_GIAY" },
    include: INCLUDE_DANG_KY,
  });

  const ketQua = await Promise.all(dsChoNopGiay.map((dk) => tuDongHuyNeuQuaHan(dk.id)));
  return ketQua.filter((dk) => dk.trangThai === "CHO_NOP_GIAY");
}

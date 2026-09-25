import { prisma } from "@/lib/db/prisma";
import { timGiangVienChoHocPhan } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import { KhongTimThayBuoiHocError } from "@/server/services/kh/loi-khoa";
import { KhongDuocPhanCongBuoiHocError } from "@/server/services/gd/loi-giang-day";

export async function giangVienCuaTaiKhoan(nguoiDungId: string) {
  return prisma.giangVien.findUnique({ where: { nguoiDungId } });
}

/**
 * GD-01/GD-02: "Chỉ giảng viên được phân công buổi học mới điểm danh/ghi
 * nhật ký được" - phân công xác định gián tiếp qua học phần của buổi học
 * (KH-02), giống cách KH-03 xác định giảng viên để kiểm tra trùng lịch. Buổi
 * học không gắn học phần thì không ai được coi là "được phân công".
 */
export async function layBuoiHocNeuDuocPhanCong(giangVienId: string, buoiHocId: string) {
  const buoiHoc = await prisma.buoiHoc.findUnique({ where: { id: buoiHocId } });
  if (!buoiHoc) throw new KhongTimThayBuoiHocError();

  const giangVienPhuTrach = buoiHoc.hocPhanId
    ? await timGiangVienChoHocPhan(buoiHoc.khoaId, buoiHoc.hocPhanId)
    : null;
  if (!giangVienPhuTrach || giangVienPhuTrach !== giangVienId) {
    throw new KhongDuocPhanCongBuoiHocError();
  }

  return buoiHoc;
}
